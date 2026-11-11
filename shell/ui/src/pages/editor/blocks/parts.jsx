// Potongan bersama untuk custom block di editor.

// Ketikan di field block tidak boleh sampai ke editor di sekelilingnya
// (kalau sampai, Backspace bisa menghapus block-nya).
const stop = (event) => event.stopPropagation();

// Bingkai block: label jenis di atas, isi di bawah.
export function Frame({ icon: Icon, label, tone = '', actions, children }) {
  return (
    <div className={`schema-block ${tone}`}>
      <div className="schema-block-head" contentEditable={false}>
        <Icon className="size-4" />
        <span>{label}</span>
        {actions && <span className="ml-auto flex items-center gap-1">{actions}</span>}
      </div>
      {children}
    </div>
  );
}

// Field teks yang nilainya disimpan di properti block.
export function PropInput({ editor, block, name, placeholder, strong = false, type = 'text' }) {
  return (
    <input
      type={type}
      contentEditable={false}
      className={`schema-block-input ${strong ? 'font-semibold' : ''}`}
      value={block.props[name]}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(event) => editor.updateBlock(block, { props: { [name]: event.target.value } })}
      onKeyDown={stop}
      onKeyUp={stop}
      onKeyPress={stop}
      onPaste={stop}
      onMouseDown={stop}
    />
  );
}

export const stopEditorKeys = { onKeyDown: stop, onKeyUp: stop, onKeyPress: stop, onPaste: stop, onMouseDown: stop };
