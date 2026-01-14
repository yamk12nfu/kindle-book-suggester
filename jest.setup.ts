import "@testing-library/jest-dom";

// jsdomには scrollTo が無いので、Chatの自動スクロールで落ちないようにする
if (typeof Element !== "undefined") {
  if (!("scrollTo" in Element.prototype)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Element.prototype as any).scrollTo = () => {};
  }
}

