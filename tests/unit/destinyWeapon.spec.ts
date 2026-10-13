import { describe, expect, it } from 'vitest'
import { calculateWeaponCorrectionValue } from '@/core/weaponCorrection'
import { resolveCombatFormulaInputs, type CombatPowerContext } from '@/core/combatPower'

describe('命運II', () => {
  it.each([false, true])('二階弓25星總攻1072，第25星增加38（神之子=%s）', (isZeroJob) => {
    const input = { weaponSet: 'fortune2', flameLevel: 7, scrollAtk: 81,
      starCount: 25, currentWeaponAtk: 1000, jobCategory: 'normal' as const, isZeroJob }
    expect(calculateWeaponCorrectionValue('fortune2', input)).toBe(72)
    expect(calculateWeaponCorrectionValue('fortune2', input)
      - calculateWeaponCorrectionValue('fortune2', { ...input, starCount: 24 })).toBe(38)
  })
  it('原始與含Buff公式都採固有15% Boss，終傷仍只有10%', () => {
    const ctx: CombatPowerContext = { jobCategory: 'normal', jobName: '英雄',
      weaponSet: 'fortune', genesisFinalChecked: true, useBuff: false,
      overseasGenesisAtkDelta: 0, xenonPowerCoefficientRaw: '', daPowerCoefficientRaw: '' }
    for (const useBuff of [false, true]) {
      const first = resolveCombatFormulaInputs({ bossDmg: 100 }, { ...ctx, useBuff })
      const second = resolveCombatFormulaInputs({ bossDmg: 100 }, { ...ctx, weaponSet: 'fortune2', useBuff })
      expect(second.bossDamage).toBe(first.bossDamage + 15)
      expect(second.finalMult).toBe(first.finalMult)
    }
  })
})
