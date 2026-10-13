import type { LayoutServerLoad } from './$types'
import { layoutCompareData } from '$lib/compare.js'

export const load: LayoutServerLoad = async ({ locals }) => ({ user: locals.user, ...layoutCompareData() })
