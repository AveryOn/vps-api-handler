import { fileURLToPath } from "url"
import path from 'path'

// эмулируем __dirname в ESM
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);