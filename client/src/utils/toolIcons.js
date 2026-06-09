import { 
  FiLayers, FiRotateCw, FiEdit3
} from 'react-icons/fi';
import { 
  BiWrench
} from 'react-icons/bi';
import { 
  MdCompress, MdVerified, MdSlideshow, MdImage, MdLanguage, MdPictureAsPdf,
  MdEdit, MdCompareArrows, MdHighlightOff, MdOutlineSignpost,
  MdLock, MdLockOpen, MdScanner, MdSearch, MdSmartToy, MdTranslate,
  MdFormatListNumbered
} from 'react-icons/md';
import { 
  AiOutlineFileWord, AiOutlineFileExcel, AiOutlineMergeCells, AiOutlineSplitCells
} from 'react-icons/ai';

// Helper to create icon with consistent styling
const createIcon = (IconComponent, size = 28) => {
  if (!IconComponent) return null;
  return <IconComponent size={size} strokeWidth={1.5} />;
};

const ICON_MAP = {
  'merge':        createIcon(AiOutlineMergeCells),
  'split':        createIcon(AiOutlineSplitCells),
  'rotate':       createIcon(FiRotateCw),
  'pagenumbers':  createIcon(MdFormatListNumbered),
  'watermark':    createIcon(FiEdit3),
  'compress':     createIcon(MdCompress),
  'pdfa':         createIcon(MdVerified),
  'pdf-to-word':  createIcon(AiOutlineFileWord),
  'pdf-to-ppt':   createIcon(MdSlideshow),
  'pdf-to-excel': createIcon(AiOutlineFileExcel),
  'pdf-to-jpg':   createIcon(MdImage),
  'html-to-pdf':  createIcon(MdLanguage),
  'word-to-pdf':  createIcon(MdPictureAsPdf),
  'ppt-to-pdf':   createIcon(MdPictureAsPdf),
  'excel-to-pdf': createIcon(MdPictureAsPdf),
  'jpg-to-pdf':   createIcon(MdPictureAsPdf),
  'merge-image':  createIcon(MdImage),
  'edit':         createIcon(MdEdit),
  'compare':      createIcon(MdCompareArrows),
  'redact':       createIcon(MdHighlightOff),
  'sign':         createIcon(MdOutlineSignpost),
  'protect':      createIcon(MdLock),
  'unlock':       createIcon(MdLockOpen),
  'ocr':          createIcon(MdSearch),
  'ai-summarize': createIcon(MdSmartToy),
  'ai-translate': createIcon(MdTranslate)
};

export const getToolIcon = (slug, fallback = '📄') => {
  return ICON_MAP[slug] || fallback;
};

export default ICON_MAP;
