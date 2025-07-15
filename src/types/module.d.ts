declare module 'supports-color' {
  const supportColor: any;
  export = supportColor;
}

declare module 'debug' {
  const debug: any;
  export = debug;
}

declare module 'pdfjs-dist/build/pdf' {
  export * from 'pdfjs-dist';
}

declare module 'pdfjs-dist/webpack' {
  export * from 'pdfjs-dist';
}

declare module 'pdfjs-dist/web/pdf_viewer.css' {
  const content: any;
  export default content;
}

declare module 'pdfjs-dist/build/pdf.mjs' {
  export * from 'pdfjs-dist';
} 