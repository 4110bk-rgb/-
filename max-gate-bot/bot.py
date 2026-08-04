"""
Лид-бот для мессенджера MAX.
Собирает заявку (имя, телефон, город, размер проёма) диалогом и пересылает
её администратору личным сообщением в MAX. Дополнительно пишет резервную
копию каждой заявки в leads.jsonl на случай, если пересылка не удалась.

Работает через long polling (GET /updates) — не нужен свой сервер с HTTPS.
Для продакшена с большой нагрузкой лучше перейти на webhook (POST /subscriptions).

Настройка:
  1. Создать бота в личном кабинете https://dev.max.ru и получить токен.
  2. export MAX_BOT_TOKEN="..."
  3. pip install -r requirements.txt
  4. python bot.py
  5. Написать боту что угодно, затем отправить команду /whoami — бот пришлёт
     ваш user_id. Задать его в переменной ADMIN_USER_ID и перезапустить бота.
"""

import json
import os
import re
import time
import traceback
from datetime import datetime, timezone

import requests

BASE_URL = "https://platform-api2.max.ru"
BOT_TOKEN = os.environ.get("MAX_BOT_TOKEN", "")
ADMIN_USER_ID = os.environ.get("ADMIN_USER_ID", "")  # заполняется после первого запуска
LEADS_FILE = os.path.join(os.path.dirname(__file__), "leads.jsonl")

session = requests.Session()
session.headers.update({
    "Authorization": BOT_TOKEN,
    "Content-Type": "application/json",
})

# ---------------------------------------------------------------------------
# Низкоуровневые вызовы API
# ---------------------------------------------------------------------------

def api_get(path, **params):
    resp = session.get(f"{BASE_URL}{path}", params=params, timeout=40)
    resp.raise_for_status()
    return resp.json()


def api_post(path, params=None, body=None):
    resp = session.post(f"{BASE_URL}{path}", params=params or {}, json=body or {}, timeout=20)
    if not resp.ok:
        print(f"[api_post] {path} -> {resp.status_code}: {resp.text[:500]}")
    resp.raise_for_status()
    return resp.json()


def send_text(user_id, text):
    return api_post("/messages", params={"user_id": user_id}, body={"text": text})


# Разные площадки МАХ отдают поля то в camelCase, то в snake_case в
# зависимости от версии API — берём первое совпадение, чтобы бот не падал
# при небольших расхождениях со сводкой документации.
def pick(d, *keys, default=None):
    for k in keys:
        if isinstance(d, dict) and k in d and d[k] is not None:
            return d[k]
    return default


def parse_message_created(update):
    message = pick(update, "message", default={}) or {}
    sender = pick(message, "sender", default={}) or {}
    body = pick(message, "body", default={}) or {}

    user_id = pick(sender, "user_id", "userId") or pick(update, "user_id", "userId")
    text = (pick(body, "text", default="") or "").strip()
    return user_id, text


# ---------------------------------------------------------------------------
# Диалог сбора заявки
# ---------------------------------------------------------------------------

STATE_NAME, STATE_PHONE, STATE_CITY, STATE_GATE, STATE_CONFIRM = range(5)

FIELD_TITLES = {
    "name": "Имя",
    "phone": "Телефон",
    "city": "Город",
    "gate": "Размер проёма / что нужно",
}

sessions = {}  # user_id -> {"state": int, "data": {...}}

PHONE_RE = re.compile(r"\d")


def start_flow(user_id):
    sessions[user_id] = {"state": STATE_NAME, "data": {}}
    send_text(user_id, "Здравствуйте! Помогу оформить заявку на замер ворот.\n\nКак к вам обращаться?")


def handle_message(user_id, text):
    low = text.strip().lower()

    if low in ("/start", "начать", "старт"):
        start_flow(user_id)
        return

    if low in ("/cancel", "отмена"):
        sessions.pop(user_id, None)
        send_text(user_id, "Заявка отменена. Напишите /start, если захотите оформить её снова.")
        return

    if low in ("/whoami",):
        send_text(user_id, f"Ваш user_id: {user_id}")
        return

    session_state = sessions.get(user_id)
    if session_state is None:
        start_flow(user_id)
        return

    state = session_state["state"]
    data = session_state["data"]

    if state == STATE_NAME:
        if len(text.strip()) < 2:
            send_text(user_id, "Напишите, пожалуйста, имя текстом.")
            return
        data["name"] = text.strip()
        session_state["state"] = STATE_PHONE
        send_text(user_id, "Спасибо! По какому телефону с вами связаться?")
        return

    if state == STATE_PHONE:
        digits = len(PHONE_RE.findall(text))
        if digits < 10:
            send_text(user_id, "Похоже, в номере не хватает цифр. Пришлите телефон ещё раз, например: +7 900 123-45-67")
            return
        data["phone"] = text.strip()
        session_state["state"] = STATE_CITY
        send_text(user_id, "В каком городе нужны ворота?")
        return

    if state == STATE_CITY:
        if len(text.strip()) < 2:
            send_text(user_id, "Уточните, пожалуйста, город текстом.")
            return
        data["city"] = text.strip()
        session_state["state"] = STATE_GATE
        send_text(user_id, "Какой примерно размер проёма (в метрах)? Если не знаете точно — так и напишите, уточним на замере.")
        return

    if state == STATE_GATE:
        data["gate"] = text.strip() or "не указано"
        session_state["state"] = STATE_CONFIRM
        summary = "\n".join(f"{FIELD_TITLES[k]}: {v}" for k, v in data.items())
        send_text(user_id, f"Проверьте заявку:\n\n{summary}\n\nВсё верно? Напишите «да» — отправим заявку, или «изменить» — заполним заново.")
        return

    if state == STATE_CONFIRM:
        if low in ("да", "верно", "ок", "отправить"):
            submit_lead(user_id, data)
            sessions.pop(user_id, None)
            send_text(user_id, "Заявка отправлена! Мы перезвоним вам в течение рабочего дня.")
        elif low in ("изменить", "нет", "заново"):
            start_flow(user_id)
        else:
            send_text(user_id, "Напишите «да», чтобы отправить заявку, или «изменить», чтобы заполнить заново.")
        return


def submit_lead(user_id, data):
    lead = {
        "user_id": user_id,
        "name": data.get("name"),
        "phone": data.get("phone"),
        "city": data.get("city"),
        "gate": data.get("gate"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    with open(LEADS_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(lead, ensure_ascii=False) + "\n")

    if ADMIN_USER_ID:
        text = (
            "Новая заявка с сайта:\n"
            f"Имя: {lead['name']}\n"
            f"Телефон: {lead['phone']}\n"
            f"Город: {lead['city']}\n"
            f"Проём: {lead['gate']}"
        )
        try:
            send_text(ADMIN_USER_ID, text)
        except Exception:
            print("[submit_lead] не удалось отправить заявку админу:")
            traceback.print_exc()
    else:
        print("[submit_lead] ADMIN_USER_ID не задан — заявка сохранена только в leads.jsonl")


# ---------------------------------------------------------------------------
# Long polling
# ---------------------------------------------------------------------------

def poll_loop():
    if not BOT_TOKEN:
        raise SystemExit("Задайте переменную окружения MAX_BOT_TOKEN")

    me = api_get("/me")
    print(f"Бот запущен: {me}")

    marker = None
    while True:
        try:
            params = {"timeout": 30, "limit": 50}
            if marker is not None:
                params["marker"] = marker
            resp = api_get("/updates", **params)

            updates = pick(resp, "updates", default=[]) or []
            marker = pick(resp, "marker", default=marker)

            for update in updates:
                update_type = pick(update, "update_type", "updateType")
                if update_type != "message_created":
                    continue
                user_id, text = parse_message_created(update)
                if not user_id or not text:
                    continue
                try:
                    handle_message(user_id, text)
                except Exception:
                    print("[handle_message] ошибка обработки сообщения:")
                    traceback.print_exc()

        except requests.exceptions.RequestException as e:
            print(f"[poll_loop] сетевая ошибка: {e}, повтор через 5с")
            time.sleep(5)
        except Exception:
            print("[poll_loop] неожиданная ошибка:")
            traceback.print_exc()
            time.sleep(5)


if __name__ == "__main__":
    poll_loop()
