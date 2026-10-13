import type { JobStatLabels } from './types'
import type { NexonEquipmentItem } from '@/services/nexonApi'

export const EQUIPMENT_IMPORT_SUFFIXES = [
  'BaseMain',
  'PercentMain',
  'NoApplyMain',
  'BaseSub',
  'PercentSub',
  'NoApplySub',
  'BaseSubtwo',
  'PercentSubtwo',
  'NoApplySubtwo',
  'AllStat',
  'AllStatPercent',
  'Atk',
  'PercentAtk',
  'Dmg',
  'BossDmg',
  'CritDmg',
  'FamFinal',
  'IgnoreDefense',
] as const

export type EquipmentImportSuffix = (typeof EQUIPMENT_IMPORT_SUFFIXES)[number]
export type EquipmentImportValues = Record<EquipmentImportSuffix, number>

export interface ParsedEquipmentImport {
  values: EquipmentImportValues
  unrecognizedPotentialLines: string[]
}

const potentialKeys = [
  'potential_option_1',
  'potential_option_2',
  'potential_option_3',
  'additional_potential_option_1',
  'additional_potential_option_2',
  'additional_potential_option_3',
] as const

function numeric(value: unknown): number {
  const parsed = Number(
    String(value ?? '')
      .replace(/,/g, '')
      .replace(/%/g, '')
      .trim(),
  )
  return Number.isFinite(parsed) ? parsed : 0
}

function emptyValues(): EquipmentImportValues {
  return Object.fromEntries(
    EQUIPMENT_IMPORT_SUFFIXES.map((suffix) => [suffix, 0]),
  ) as EquipmentImportValues
}

function optionKey(label: string): keyof NexonEquipmentItem['item_total_option'] | null {
  if (label === 'STR') return 'str'
  if (label === 'DEX') return 'dex'
  if (label === 'INT') return 'int'
  if (label === 'LUK') return 'luk'
  if (label === 'HP') return 'max_hp'
  return null
}

function normalizeLine(line: string): string {
  return line
    .trim()
    .replace(/[：]/g, ':')
    .replace(/％/g, '%')
    .replace(/＋/g, '+')
    .replace(/\s+/g, ' ')
}

function lineValue(line: string): { value: number; percent: boolean } | null {
  const match = line.match(/([+-]?\d[\d,]*(?:\.\d+)?)\s*(%)?\s*$/)
  if (!match) return null
  return { value: numeric(match[1]), percent: Boolean(match[2]) }
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term))
}

function combineIgnoreDefense(sources: number[]): number {
  const residual = sources.reduce((factor, value) => factor * (1 - value / 100), 1)
  return (1 - residual) * 100
}

/** 將官方 API 的單件裝備資料轉成既有「原裝備／變更後裝備」欄位。 */
export function parseNexonEquipmentItem(
  item: NexonEquipmentItem,
  labels: JobStatLabels,
): ParsedEquipmentImport {
  const values = emptyValues()
  const total = item.item_total_option || {}
  const mainKey = optionKey(labels.main)
  const subKey = optionKey(labels.sub)
  const secondSubKey = optionKey(labels.secondSub)

  values.BaseMain = mainKey ? numeric(total[mainKey]) : 0
  values.BaseSub = subKey ? numeric(total[subKey]) : 0
  values.BaseSubtwo = secondSubKey ? numeric(total[secondSubKey]) : 0
  values.AllStatPercent = numeric(total.all_stat)
  values.Atk = numeric(labels.main === 'INT' ? total.magic_power : total.attack_power)
  values.Dmg = numeric(total.damage)
  values.BossDmg = numeric(total.boss_damage)

  const ignoreSources: number[] = []
  const innateIgnore = numeric(total.ignore_monster_armor)
  if (innateIgnore) ignoreSources.push(innateIgnore)

  const unrecognizedPotentialLines: string[] = []
  for (const key of potentialKeys) {
    const rawLine = item[key]
    if (typeof rawLine !== 'string' || !rawLine.trim()) continue
    const line = normalizeLine(rawLine)
    const parsed = lineValue(line)
    const hasConditionalScaling = includesAny(line, ['每', '等級', '機率', '冷卻'])
    if (!parsed || hasConditionalScaling) {
      unrecognizedPotentialLines.push(rawLine)
      continue
    }

    const upper = line.toUpperCase()
    const isAllStat = includesAny(upper, ['全屬', '全部能力值', 'ALL STAT'])
    const isBoss = includesAny(upper, ['BOSS', '首領'])
    const isIgnore = includesAny(upper, ['無視']) && includesAny(upper, ['防禦', '防御'])
    const isCritDamage = includesAny(upper, ['爆擊傷害', '暴擊傷害', '爆傷', 'CRITICAL DAMAGE'])
    const isAttack = includesAny(upper, ['攻擊力', '魔力', 'ATTACK POWER', 'MAGIC POWER'])
    const isDamage = includesAny(upper, ['傷害', 'DAMAGE'])

    if (isAllStat && parsed.percent) values.AllStatPercent += parsed.value
    else if (isIgnore && parsed.percent) ignoreSources.push(parsed.value)
    else if (isBoss && parsed.percent) values.BossDmg += parsed.value
    else if (isCritDamage && parsed.percent) values.CritDmg += parsed.value
    else if (isAttack && parsed.percent) values.PercentAtk += parsed.value
    else if (isAttack) values.Atk += parsed.value
    else if (isDamage && parsed.percent) values.Dmg += parsed.value
    else {
      const statMatches = [
        { label: labels.main, flat: 'BaseMain', percent: 'PercentMain' },
        { label: labels.sub, flat: 'BaseSub', percent: 'PercentSub' },
        { label: labels.secondSub, flat: 'BaseSubtwo', percent: 'PercentSubtwo' },
      ] as const
      const stat = statMatches.find(({ label }) => label && upper.includes(label.toUpperCase()))
      if (stat) values[parsed.percent ? stat.percent : stat.flat] += parsed.value
      else unrecognizedPotentialLines.push(rawLine)
    }
  }

  values.IgnoreDefense = combineIgnoreDefense(ignoreSources)
  return { values, unrecognizedPotentialLines }
}
