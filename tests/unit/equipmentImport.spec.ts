import { describe, expect, it } from 'vitest'
import { parseNexonEquipmentItem } from '@/core/equipmentImport'
import type { NexonEquipmentItem } from '@/services/nexonApi'

function item(overrides: Partial<NexonEquipmentItem> = {}): NexonEquipmentItem {
  return {
    item_equipment_part: '帽子',
    item_equipment_slot: '帽子',
    item_name: '測試帽子',
    item_icon: 'https://example.invalid/hat.png',
    item_total_option: {},
    ...overrides,
  }
}

describe('NEXON Open API 裝備欄位解析', () => {
  it('依職業主副屬解析總能力，並將潛能加到正確欄位', () => {
    const parsed = parseNexonEquipmentItem(
      item({
        item_total_option: {
          str: '120',
          dex: '80',
          attack_power: '60',
          all_stat: '5',
          boss_damage: '30',
          ignore_monster_armor: '10',
        },
        potential_option_1: 'STR : +12%',
        potential_option_2: '全屬性：+9%',
        potential_option_3: '攻擊力：+12%',
        additional_potential_option_1: '攻擊Boss怪物時傷害：+40%',
        additional_potential_option_2: '無視怪物防禦率：+30%',
        additional_potential_option_3: '爆擊傷害：+8%',
      }),
      { main: 'STR', sub: 'DEX', secondSub: '' },
    )

    expect(parsed.values.BaseMain).toBe(120)
    expect(parsed.values.BaseSub).toBe(80)
    expect(parsed.values.PercentMain).toBe(12)
    expect(parsed.values.AllStatPercent).toBe(14)
    expect(parsed.values.Atk).toBe(60)
    expect(parsed.values.PercentAtk).toBe(12)
    expect(parsed.values.BossDmg).toBe(70)
    expect(parsed.values.CritDmg).toBe(8)
    expect(parsed.values.IgnoreDefense).toBeCloseTo(37, 10)
    expect(parsed.unrecognizedPotentialLines).toEqual([])
  })

  it('INT 職業採用魔力，並保留無法安全換算的特殊潛能', () => {
    const parsed = parseNexonEquipmentItem(
      item({
        item_total_option: { int: '90', luk: '40', attack_power: '12', magic_power: '75' },
        potential_option_1: 'INT：+12',
        potential_option_2: '每 9 等級 INT +2',
      }),
      { main: 'INT', sub: 'LUK', secondSub: '' },
    )

    expect(parsed.values.BaseMain).toBe(102)
    expect(parsed.values.BaseSub).toBe(40)
    expect(parsed.values.Atk).toBe(75)
    expect(parsed.unrecognizedPotentialLines).toEqual(['每 9 等級 INT +2'])
  })

  it('傑諾會解析第二副屬', () => {
    const parsed = parseNexonEquipmentItem(
      item({ item_total_option: { str: '30', dex: '31', luk: '32' } }),
      { main: 'STR', sub: 'DEX', secondSub: 'LUK' },
    )

    expect(parsed.values.BaseMain).toBe(30)
    expect(parsed.values.BaseSub).toBe(31)
    expect(parsed.values.BaseSubtwo).toBe(32)
  })
})
