<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCharacterStore } from '@/stores/character'
import { parseNexonEquipmentItem } from '@/core/equipmentImport'
import {
  loadNexonCharacterEquipment,
  NexonApiError,
  type NexonCharacterEquipment,
} from '@/services/nexonApi'

const store = useCharacterStore()
const apiKey = ref('')
const characterName = ref('')
const loading = ref(false)
const errorMessage = ref('')
const loaded = ref<NexonCharacterEquipment | null>(null)
const selectedIndex = ref(0)
const importedMessage = ref('')

const equipment = computed(() => loaded.value?.equipment.item_equipment || [])
const selectedItem = computed(() => equipment.value[selectedIndex.value] || null)
const parsedItem = computed(() =>
  selectedItem.value ? parseNexonEquipmentItem(selectedItem.value, store.statLabels) : null,
)
const appliedSetEffectCount = computed(
  () =>
    loaded.value?.setEffects.set_effect.reduce(
      (count, set) => count + set.set_effect_info.length,
      0,
    ) || 0,
)

async function queryCharacter() {
  errorMessage.value = ''
  importedMessage.value = ''
  loading.value = true
  try {
    loaded.value = await loadNexonCharacterEquipment(apiKey.value, characterName.value)
    selectedIndex.value = 0
  } catch (error) {
    errorMessage.value =
      error instanceof NexonApiError ? error.message : '無法連線至 NEXON Open API，請稍後再試。'
  } finally {
    loading.value = false
  }
}

function applyTo(side: 'old' | 'new') {
  if (!selectedItem.value || !parsedItem.value) return
  store.applyEquipmentImport(side, parsedItem.value.values)
  importedMessage.value = `已將「${selectedItem.value.item_name}」帶入${side === 'old' ? '原裝備' : '變更後裝備'}。`
}
</script>

<template>
  <details class="equipment-import-panel">
    <summary>
      <span class="equipment-import-summary-icon">⚡</span>
      <span>
        <strong>官方 API 快速匯入</strong>
        <small>用角色名稱選取已穿戴裝備，不必逐欄輸入</small>
      </span>
      <span class="equipment-import-summary-action">展開</span>
    </summary>

    <div class="equipment-import-content">
      <form class="equipment-import-form" @submit.prevent="queryCharacter">
        <label>
          <span>API Key</span>
          <input
            v-model="apiKey"
            type="password"
            autocomplete="off"
            placeholder="NEXON Open API Key"
            required
          />
        </label>
        <label>
          <span>角色名稱</span>
          <input v-model="characterName" type="text" placeholder="輸入台服角色名稱" required />
        </label>
        <button class="equipment-import-query" type="submit" :disabled="loading">
          {{ loading ? '讀取中…' : '取得裝備' }}
        </button>
      </form>

      <p class="equipment-import-privacy">
        API Key 只保留在本次視窗的記憶體，不會寫入計算機存檔。資料來源：NEXON Open API
      </p>
      <p v-if="errorMessage" class="equipment-import-error" role="alert">{{ errorMessage }}</p>

      <div v-if="loaded && equipment.length" class="equipment-import-result">
        <div class="equipment-import-character">
          <span>{{ characterName.trim() }}</span>
          <span>{{ loaded.equipment.character_class }}</span>
          <span>{{ equipment.length }} 件裝備</span>
          <span>{{ loaded.setEffects.set_effect.length }} 組套裝</span>
        </div>

        <label class="equipment-import-select">
          <span>選擇要比較的裝備</span>
          <select v-model.number="selectedIndex">
            <option
              v-for="(item, index) in equipment"
              :key="`${item.item_equipment_slot}-${index}`"
              :value="index"
            >
              {{ item.item_equipment_slot }}｜{{ item.item_name }}
            </option>
          </select>
        </label>

        <div v-if="selectedItem && parsedItem" class="equipment-import-item">
          <img
            :src="selectedItem.item_icon"
            :alt="selectedItem.item_name"
            referrerpolicy="no-referrer"
          />
          <div class="equipment-import-item-copy">
            <strong>{{ selectedItem.item_name }}</strong>
            <span
              >{{ selectedItem.item_equipment_part }}・{{ selectedItem.item_equipment_slot }}</span
            >
            <small v-if="parsedItem.unrecognizedPotentialLines.length">
              有
              {{ parsedItem.unrecognizedPotentialLines.length }}
              條特殊潛能無法安全自動換算，帶入後請確認。
            </small>
          </div>
          <div class="equipment-import-actions">
            <button type="button" @click="applyTo('old')">帶入原裝備</button>
            <button type="button" class="is-primary" @click="applyTo('new')">帶入新裝備</button>
          </div>
        </div>

        <p v-if="importedMessage" class="equipment-import-success" role="status">
          {{ importedMessage }}
        </p>

        <details v-if="loaded.setEffects.set_effect.length" class="equipment-import-sets">
          <summary>
            已讀取 {{ loaded.setEffects.set_effect.length }} 組套裝、{{ appliedSetEffectCount }}
            階已套用效果
          </summary>
          <div
            v-for="set in loaded.setEffects.set_effect"
            :key="set.set_name"
            class="equipment-import-set"
          >
            <strong>{{ set.set_name }}（{{ set.total_set_count }} 件）</strong>
            <span
              v-for="effect in set.set_effect_info"
              :key="`${set.set_name}-${effect.set_count}`"
            >
              {{ effect.set_count }} 件：{{ effect.set_option }}
            </span>
          </div>
          <p>目前先供核對；換裝後套裝件數模擬會在下一階段加入。</p>
        </details>
      </div>
      <p v-else-if="loaded" class="equipment-import-empty">這個角色目前沒有可匯入的穿戴裝備。</p>
    </div>
  </details>
</template>

<style scoped>
.equipment-import-panel {
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid rgba(152, 205, 255, 0.3);
  border-radius: 16px;
  background: rgba(25, 39, 68, 0.68);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
}

.equipment-import-panel > summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 10px 16px;
  cursor: pointer;
  list-style: none;
}

.equipment-import-panel > summary::-webkit-details-marker {
  display: none;
}

.equipment-import-panel > summary > span:nth-child(2) {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.equipment-import-panel summary strong {
  color: #f4f9ff;
  font-size: 15px;
}

.equipment-import-panel summary small,
.equipment-import-privacy,
.equipment-import-item-copy span,
.equipment-import-item-copy small {
  color: rgba(211, 227, 247, 0.72);
}

.equipment-import-summary-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 10px;
  background: rgba(109, 174, 233, 0.18);
}

.equipment-import-summary-action {
  color: #a9d8ff;
  font-size: 13px;
  font-weight: 800;
}

.equipment-import-panel[open] .equipment-import-summary-action {
  font-size: 0;
}

.equipment-import-panel[open] .equipment-import-summary-action::after {
  content: '收合';
  font-size: 13px;
}

.equipment-import-content {
  padding: 0 16px 16px;
  border-top: 1px solid rgba(202, 223, 248, 0.12);
}

.equipment-import-form {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(180px, 0.8fr) auto;
  gap: 10px;
  padding-top: 14px;
}

.equipment-import-form label,
.equipment-import-select {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  color: rgba(231, 241, 255, 0.82);
  font-size: 12px;
  font-weight: 800;
}

.equipment-import-form input,
.equipment-import-select select {
  width: 100%;
  height: 40px;
  padding: 8px 11px;
  border: 1px solid rgba(195, 220, 250, 0.25);
  border-radius: 10px;
  background: rgba(20, 33, 58, 0.72);
  color: #f5f9ff;
  font: inherit;
}

.equipment-import-query,
.equipment-import-actions button {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid rgba(154, 205, 250, 0.38);
  border-radius: 10px;
  background: rgba(76, 119, 168, 0.28);
  color: #eaf6ff;
  font-weight: 800;
  cursor: pointer;
}

.equipment-import-query {
  align-self: end;
}

.equipment-import-query:disabled {
  cursor: progress;
  opacity: 0.65;
}

.equipment-import-privacy,
.equipment-import-error,
.equipment-import-success,
.equipment-import-empty {
  margin: 9px 0 0;
  font-size: 12px;
}

.equipment-import-error {
  color: #ffc1c1;
}

.equipment-import-success {
  color: #bff3cc;
}

.equipment-import-result {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.equipment-import-character {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.equipment-import-character span {
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(136, 178, 226, 0.14);
  color: #dceeff;
  font-size: 12px;
  font-weight: 700;
}

.equipment-import-item {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(205, 224, 247, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.equipment-import-item img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  image-rendering: pixelated;
}

.equipment-import-item-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.equipment-import-item-copy strong {
  overflow: hidden;
  color: #fff;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.equipment-import-item-copy small {
  color: #ffd3a0;
}

.equipment-import-actions {
  display: flex;
  gap: 7px;
}

.equipment-import-actions button.is-primary {
  border-color: rgba(121, 193, 255, 0.68);
  background: linear-gradient(135deg, #447fba, #5a70ba);
}

.equipment-import-sets {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(15, 27, 49, 0.48);
  color: rgba(224, 237, 253, 0.82);
  font-size: 12px;
}

.equipment-import-sets > summary {
  cursor: pointer;
  color: #cce8ff;
  font-weight: 800;
}

.equipment-import-set {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 10px;
}

@media (max-width: 760px) {
  .equipment-import-form {
    grid-template-columns: 1fr;
  }

  .equipment-import-query {
    width: 100%;
  }

  .equipment-import-item {
    grid-template-columns: 44px minmax(0, 1fr);
  }

  .equipment-import-actions {
    grid-column: 1 / -1;
  }

  .equipment-import-actions button {
    flex: 1;
  }
}
</style>
