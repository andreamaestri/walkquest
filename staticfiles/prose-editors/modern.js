
const marker = "data-django-prose-editor-modern";

function createEditor(textarea) {
  if (textarea.closest(".prose-editor")) return;
  const config = JSON.parse(textarea.getAttribute(marker));

  const {
    Document,
    Dropcursor,
    Gapcursor,
    Paragraph,
    HardBreak,
    Text,
    Bold,
    Italic,
    Subscript,
    Superscript,
    Link,
    Heading,
    BulletList,
    OrderedList,
    ListItem,
    Menu,
    createTextareaEditor,
  } = window.DjangoProseEditor;

  const extensions = [
    Document,
    Dropcursor,
    Gapcursor,
    Paragraph,
    HardBreak,
    Text,
    Bold,
    Italic,
    Subscript,
    Superscript,
    Link.configure({ openOnClick: false }),
    Heading.configure({ levels: [1, 2, 3] }),
    BulletList,
    OrderedList,
    ListItem,
    Menu.configure({ 
      config,
      floating: true,
      shouldShow: true,
    }),
  ];

  return createTextareaEditor(textarea, extensions);
}

window.DjangoProseEditor.initializeEditors(createEditor, `[${marker}]`);