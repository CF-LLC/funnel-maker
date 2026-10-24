import { TemplatePicker } from '@/components/templates/template-picker'
import { Stepper } from '@/components/builder/stepper'

export default function DashboardTemplatesPage() {
  return (
    <div className="space-y-8">
      <Stepper current={1} />
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Pick a template</h1>
        <p className="mt-1 text-muted-foreground">Choose a look. You can change every word and image on the next screen.</p>
      </div>
      <TemplatePicker returnTo="/funnels/templates" />
    </div>
  )
}

