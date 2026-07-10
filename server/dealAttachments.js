const { listAll, userNames } = require('./bitrixClient');

// Strips the internal "[DISK FILE ID=n12345]" markers Bitrix24 inserts into
// the comment text for each attached file — the FILES map already carries
// that data, so the marker is just noise for a human-facing message.
function stripFileMarkers(text) {
  return (text || '').replace(/\[DISK FILE ID=n?\d+\]/g, '').trim();
}

// Photos and files a manager attached to a deal live on its timeline as
// comments (crm.timeline.comment) — each comment's FILES map holds one entry
// per attachment, with `type: 'image'` (and an {width, height} object under
// `image`) distinguishing photos from plain files.
async function getDealAttachments(dealId) {
  const comments = await listAll('crm.timeline.comment.list', {
    filter: { ENTITY_ID: dealId, ENTITY_TYPE: 'deal' },
    order: { ID: 'ASC' },
  });

  const authorIds = [...new Set(comments.map((c) => c.AUTHOR_ID).filter(Boolean))];
  const authorNames = await userNames(authorIds);

  const items = [];
  const photos = [];
  const files = [];

  for (const c of comments) {
    const attachments = c.FILES ? Object.values(c.FILES) : [];
    const commentPhotos = attachments.filter((f) => f.type === 'image');
    const commentFiles = attachments.filter((f) => f.type !== 'image');

    items.push({
      id: c.ID,
      author: authorNames[c.AUTHOR_ID] || c.AUTHOR_ID,
      created: c.CREATED,
      text: stripFileMarkers(c.COMMENT),
      photos: commentPhotos.map((f) => ({ name: f.name, url: f.urlDownload, preview: f.urlPreview })),
      files: commentFiles.map((f) => ({ name: f.name, url: f.urlDownload })),
    });

    photos.push(...commentPhotos.map((f) => ({ name: f.name, url: f.urlDownload })));
    files.push(...commentFiles.map((f) => ({ name: f.name, url: f.urlDownload })));
  }

  return { dealId, comments: items, photos, files };
}

module.exports = { getDealAttachments };
