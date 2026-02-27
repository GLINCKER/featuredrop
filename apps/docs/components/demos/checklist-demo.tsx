import { Checklist, type ChecklistTask } from 'featuredrop/react'
import { CodeDemoCard } from '../code-demo-card'

const tasks: ChecklistTask[] = [
  {
    id: 'connect-provider',
    title: 'Connect provider',
    description: 'Wrap app shell with FeatureDropProvider.',
    estimatedTime: '2m'
  },
  {
    id: 'add-widget',
    title: 'Add changelog widget',
    description: 'Surface release notes where users already navigate.',
    estimatedTime: '3m'
  },
  {
    id: 'enable-ci',
    title: 'Enable CI checks',
    description: 'Run validate + security + size checks before merge.',
    estimatedTime: '4m'
  }
]

const checklistDemoCode = `import { Checklist } from 'featuredrop/react'

const tasks = [
  { id: 'connect-provider', title: 'Connect provider', estimatedTime: '2m' },
  { id: 'add-widget', title: 'Add changelog widget', estimatedTime: '3m' },
  { id: 'enable-ci', title: 'Enable CI checks', estimatedTime: '4m' }
]

export function ChecklistDemo() {
  return <Checklist id="docs-checklist-demo" tasks={tasks} position="inline" />
}`

const ChecklistView = Checklist as any

export function ChecklistDemo() {
  return (
    <CodeDemoCard
      title="Checklist demo"
      description="Inline checklist for onboarding and progressive task completion."
      code={checklistDemoCode}
    >
      <ChecklistView id="docs-checklist-demo" tasks={tasks} position="inline" />
    </CodeDemoCard>
  )
}
