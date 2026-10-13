import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadNexonCharacterEquipment } from '@/services/nexonApi'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: vi.fn().mockResolvedValue(body) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('NEXON Open API client', () => {
  it('先查 OCID，再平行取得裝備與套裝效果', async () => {
    const equipment = {
      date: '2026-10-12T00:00+08:00',
      character_gender: '女',
      character_class: '英雄',
      preset_no: 1,
      item_equipment: [],
    }
    const setEffects = { date: '2026-10-12T00:00+08:00', set_effect: [] }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ocid: 'ocid-123' }))
      .mockResolvedValueOnce(jsonResponse(equipment))
      .mockResolvedValueOnce(jsonResponse(setEffects))
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadNexonCharacterEquipment(' secret-key ', '測試 角色')

    expect(result).toEqual({ ocid: 'ocid-123', equipment, setEffects })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][0]).toContain(
      'character_name=%E6%B8%AC%E8%A9%A6%20%E8%A7%92%E8%89%B2',
    )
    for (const call of fetchMock.mock.calls) {
      expect(call[1]).toEqual({ headers: { 'x-nxopen-api-key': 'secret-key' } })
    }
  })

  it('保留官方錯誤代碼與訊息，供介面顯示', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ error: { name: 'OPENAPI00005', message: 'Invalid API key' } }, false, 400),
        ),
    )

    await expect(loadNexonCharacterEquipment('bad-key', '角色')).rejects.toMatchObject({
      message: 'Invalid API key',
      status: 400,
      code: 'OPENAPI00005',
    })
  })

  it('缺少 API Key 或角色名稱時不會發出請求', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadNexonCharacterEquipment('', '角色')).rejects.toThrow('API Key')
    await expect(loadNexonCharacterEquipment('key', '')).rejects.toThrow('角色名稱')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
