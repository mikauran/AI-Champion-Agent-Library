// The ONLY place adapters are listed. Adding an input type = add one entry here.
import type { InputAdapter } from '../types.js'
import { openApiAdapter } from './openapi.js'
import { tabularCatalogAdapter } from './tabular-catalog.js'
import { sqlDdlAdapter } from './sql-ddl.js'

export const ADAPTERS: InputAdapter[] = [openApiAdapter, tabularCatalogAdapter, sqlDdlAdapter]
