// Mengambil data terstruktur dari block konten: tanya jawab, langkah,
// soal latihan, istilah, dan video. Data inilah yang mengisi JSON-LD, jadi
// yang dibaca mesin pencari selalu sama dengan yang tampil di halaman.

const inlineText = (content) =>
  Array.isArray(content)
    ? content.map((node) => (node.type === 'text' ? node.text : inlineText(node.content))).join('')
    : '';

// Opsi soal disimpan sebagai string JSON di properti block.
export function parseOptions(value) {
  try {
    const list = JSON.parse(value || '[]');
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

// ID video YouTube dari berbagai bentuk alamatnya, atau null.
export function youtubeId(url) {
  const match = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url ?? '');
  return match ? match[1] : null;
}

export function extract(blocks) {
  const found = { faqs: [], steps: [], questions: [], terms: [], videos: [] };

  const walk = (list) => {
    for (const block of list ?? []) {
      const props = block.props ?? {};
      const text = inlineText(block.content).trim();
      if (block.type === 'faq' && props.question?.trim() && text) {
        found.faqs.push({ question: props.question.trim(), answer: text });
      } else if (block.type === 'howtoStep' && text) {
        found.steps.push({ name: props.title?.trim() ?? '', text });
      } else if (block.type === 'quiz' && props.question?.trim()) {
        const options = parseOptions(props.options).filter((option) => option.trim());
        const answer = Number(props.answer);
        if (options.length >= 2 && options[answer] !== undefined) {
          found.questions.push({ question: props.question.trim(), options, answer, explanation: props.explanation?.trim() ?? '' });
        }
      } else if (block.type === 'term' && props.term?.trim() && text) {
        found.terms.push({ name: props.term.trim(), description: text });
      } else if (block.type === 'embedVideo' && props.url?.trim()) {
        found.videos.push({ url: props.url.trim(), title: props.title?.trim() ?? '' });
      }
      walk(block.children);
    }
  };
  walk(blocks);
  return found;
}
