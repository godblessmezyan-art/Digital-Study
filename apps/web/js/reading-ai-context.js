const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();

export class AIContextBuilder {
  constructor(book, blocks) {
    this.book = book;
    this.blocks = blocks;
  }

  fromSelection(selection) {
    const startId = selection?.anchor?.startBlockId || selection?.anchor?.blockId;
    const index = Math.max(0, this.blocks.findIndex(block => block.dataset.blockId === startId));
    const chapterId = selection?.chapterId || this.blocks[index]?.dataset.chapterId || 'opening';
    const candidates = this.blocks
      .map((block, blockIndex) => ({ block, blockIndex }))
      .filter(item => item.block.dataset.chapterId === chapterId && Math.abs(item.blockIndex - index) <= 3)
      .map(item => normalize(item.block.textContent))
      .filter(Boolean);
    return {
      bookSlug: this.book.slug,
      bookTitle: this.book.title,
      chapterId,
      chapterTitle: selection?.chapterTitle || this.blocks[index]?.dataset.chapterTitle || '正文',
      selectedText: normalize(selection?.quote).slice(0, 5000),
      nearbyText: candidates.join('\n\n').slice(0, 12000),
      selection,
    };
  }

  visibleChapter() {
    const block = this.blocks.find(item => item.getBoundingClientRect().bottom > 80) || this.blocks[0];
    return block ? { id: block.dataset.chapterId, title: block.dataset.chapterTitle } : { id: 'opening', title: '正文' };
  }
}
