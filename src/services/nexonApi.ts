const NEXON_API_BASE = 'https://open.api.nexon.com'

export interface NexonItemOption {
  str?: string
  dex?: string
  int?: string
  luk?: string
  max_hp?: string
  max_mp?: string
  attack_power?: string
  magic_power?: string
  boss_damage?: string
  ignore_monster_armor?: string
  all_stat?: string
  damage?: string
  max_hp_rate?: string
  [key: string]: string | number | undefined
}

export interface NexonEquipmentItem {
  item_equipment_part: string
  item_equipment_slot: string
  item_name: string
  item_icon: string
  item_description?: string
  item_total_option: NexonItemOption
  potential_option_1?: string
  potential_option_2?: string
  potential_option_3?: string
  additional_potential_option_1?: string
  additional_potential_option_2?: string
  additional_potential_option_3?: string
  [key: string]: unknown
}

export interface NexonItemEquipmentResponse {
  date: string
  character_gender: string
  character_class: string
  preset_no: number
  item_equipment: NexonEquipmentItem[]
}

export interface NexonSetEffectOption {
  set_count: number
  set_option: string
}

export interface NexonSetEffect {
  set_name: string
  total_set_count: number
  set_effect_info: NexonSetEffectOption[]
  set_option_full: NexonSetEffectOption[]
}

export interface NexonSetEffectResponse {
  date: string
  set_effect: NexonSetEffect[]
}

export interface NexonCharacterEquipment {
  ocid: string
  equipment: NexonItemEquipmentResponse
  setEffects: NexonSetEffectResponse
}

interface NexonErrorBody {
  error?: { name?: string; message?: string }
}

export class NexonApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'NexonApiError'
  }
}

async function requestJson<T>(path: string, apiKey: string): Promise<T> {
  const response = await fetch(`${NEXON_API_BASE}${path}`, {
    headers: { 'x-nxopen-api-key': apiKey },
  })

  if (!response.ok) {
    let body: NexonErrorBody = {}
    try {
      body = (await response.json()) as NexonErrorBody
    } catch {
      // 非 JSON 錯誤仍使用 HTTP 狀態提供可理解的訊息。
    }
    const code = body.error?.name
    const apiMessage = body.error?.message
    throw new NexonApiError(
      apiMessage || `NEXON Open API 請求失敗（HTTP ${response.status}）`,
      response.status,
      code,
    )
  }

  return (await response.json()) as T
}

export async function loadNexonCharacterEquipment(
  apiKey: string,
  characterName: string,
): Promise<NexonCharacterEquipment> {
  const trimmedKey = apiKey.trim()
  const trimmedName = characterName.trim()
  if (!trimmedKey) throw new NexonApiError('請輸入 NEXON Open API Key。')
  if (!trimmedName) throw new NexonApiError('請輸入角色名稱。')

  const identity = await requestJson<{ ocid?: string }>(
    `/maplestorytw/v1/id?character_name=${encodeURIComponent(trimmedName)}`,
    trimmedKey,
  )
  if (!identity.ocid) throw new NexonApiError('API 沒有回傳角色識別碼（OCID）。')

  const ocid = identity.ocid
  const [equipment, setEffects] = await Promise.all([
    requestJson<NexonItemEquipmentResponse>(
      `/maplestorytw/v1/character/item-equipment?ocid=${encodeURIComponent(ocid)}`,
      trimmedKey,
    ),
    requestJson<NexonSetEffectResponse>(
      `/maplestorytw/v1/character/set-effect?ocid=${encodeURIComponent(ocid)}`,
      trimmedKey,
    ),
  ])

  return { ocid, equipment, setEffects }
}
