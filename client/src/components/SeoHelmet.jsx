import { Helmet } from 'react-helmet-async';

const SITE = 'https://pdf-forge-k6sd.vercel.app';

export default function SeoHelmet({ title, description, canonical }) {
  const fullTitle = title
    ? `${title} | PDFForge`
    : 'Free Online PDF Tools — Merge, Split, Compress & Convert | PDFForge';
  const desc = description || 'PDFForge offers 20+ free online PDF tools. Merge, split, compress, convert, and edit PDFs in your browser. No installation required.';
  const url = canonical ? `${SITE}${canonical}` : SITE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  );
}
