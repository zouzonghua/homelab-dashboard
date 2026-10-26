import Modal from '@/shared/ui/Modal'
import { Button } from '@base-ui/react/button'
const groups = [
  { title: 'Dashboard', shortcuts: [
    ['?', 'Show / hide this help'],
    ['E', 'Toggle edit mode'],
    ['V', 'Switch layout (640px and wider)'],
    ['T', 'Cycle system / light / dark theme'],
    ['I / O', 'Import / export config'],
    ['G', 'Open activity log (R to refresh)'],
    ['A', 'Add a category'],
  ] },
  { title: 'Navigation & editing', shortcuts: [
    ['J / K · arrows', 'Focus next / previous group or service'],
    ['Home / End', 'Focus first / last item'],
    ['Tab / Shift + Tab', 'Move between controls'],
    ['Enter / Space', 'Activate the focused control or open a service'],
    ['N', 'Add a service to the focused group in edit mode'],
    ['R', 'Edit the focused group or service in edit mode'],
    ['D', 'Delete the focused item in edit mode (confirmation required)'],
    ['Alt + arrows', 'Move the focused item one position in edit mode'],
    ['Space · arrows · Space', 'Reorder using a focused drag handle; Esc cancels'],
  ] },
  { title: 'Dialogs', shortcuts: [
    ['Ctrl / ⌘ + Enter', 'Save the form (required fields still apply)'],
    ['Ctrl / ⌘ + Shift + Delete', 'Delete the edited item (confirmation required)'],
    ['Esc', 'Close the current dialog, or exit edit mode'],
  ] },
]

export default function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Keyboard shortcuts" onClose={onClose} className="shortcut-help">
        <Button className="shortcut-close" onClick={onClose} aria-label="Close keyboard shortcuts">Esc · Close</Button>
        <p className="shortcut-help__note">Single-key shortcuts are disabled while typing. Focus a group title or service before using item actions.</p>
        {groups.map((group) => (
          <section key={group.title}>
            <h3 >{group.title}</h3>
            <dl className="shortcut-help__list">
              {group.shortcuts.map(([key, description]) => (
                <div key={key}>
                  <dt><kbd>{key}</kbd></dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
    </Modal>
  )
}
