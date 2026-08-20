export function downloadTextFile({ name, text, documentRef = document, urlRef = URL }) {
  const url = urlRef.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const link = documentRef.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  urlRef.revokeObjectURL(url);
}
