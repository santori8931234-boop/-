import { useState } from 'react'
import { BODY_PARTS, type BodyPart } from '../lib/types'
import { mutate, useAppState } from '../lib/store'
import { uid } from '../lib/id'
import { Modal } from './Modal'

export function ExercisePicker({ onPick, onClose }: { onPick: (exerciseId: string) => void; onClose: () => void }) {
  const state = useAppState()
  const [part, setPart] = useState<BodyPart>('胸')
  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')

  const list = state.exercises.filter((e) => (query ? e.name.includes(query) : e.bodyPart === part))

  const addNew = () => {
    const name = newName.trim()
    if (!name) return
    const id = uid()
    mutate((s) => {
      s.exercises.push({ id, name, bodyPart: part })
    })
    setNewName('')
    onPick(id)
  }

  return (
    <Modal title="種目を選択" onClose={onClose}>
      <input className="search" placeholder="種目名で検索" value={query} onChange={(e) => setQuery(e.target.value)} />
      {!query && (
        <div className="chips">
          {BODY_PARTS.map((p) => (
            <button key={p} className={`chip part-${p} ${p === part ? 'active' : ''}`} onClick={() => setPart(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
      <ul className="pick-list">
        {list.map((e) => (
          <li key={e.id}>
            <button onClick={() => onPick(e.id)}>
              <span className={`dot part-${e.bodyPart}`} />
              {e.name}
              {e.bodyweight && <span className="muted small"> 自重</span>}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="muted empty">該当する種目がありません</li>}
      </ul>
      {!query && (
        <div className="row add-row">
          <input placeholder={`新しい種目（${part}）`} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn" onClick={addNew} disabled={!newName.trim()}>
            追加
          </button>
        </div>
      )}
    </Modal>
  )
}
