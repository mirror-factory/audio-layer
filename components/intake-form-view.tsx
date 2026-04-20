import type { IntakeForm } from "@/lib/assemblyai/intake";

interface IntakeFormViewProps {
  intakeForm: IntakeForm | null;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-sm text-[#d4d4d4]">{value ?? "N/A"}</dd>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <dt className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd>
        {items.length === 0 ? (
          <span className="text-sm text-[#525252]">None</span>
        ) : (
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={i} className="text-sm text-[#d4d4d4]">
                {item}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

export function IntakeFormView({ intakeForm }: IntakeFormViewProps) {
  if (!intakeForm) {
    return (
      <div className="bg-[#171717] rounded-xl p-4 lg:p-6">
        <h3 className="text-sm font-semibold text-[#e5e5e5] mb-4 uppercase tracking-wider">
          Intake Form
        </h3>
        <p className="text-sm text-[#525252]">No intake data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#171717] rounded-xl p-4 lg:p-6">
      <h3 className="text-sm font-semibold text-[#e5e5e5] mb-4 uppercase tracking-wider">
        Intake Form
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Field label="Intent" value={intakeForm.intent} />
        <Field
          label="Primary Participant"
          value={intakeForm.primaryParticipant}
        />
        <Field label="Organization" value={intakeForm.organization} />
        <Field label="Email" value={intakeForm.contactInfo.email} />
        <Field label="Phone" value={intakeForm.contactInfo.phone} />
        <Field label="Budget" value={intakeForm.budgetMentioned} />
        <Field label="Timeline" value={intakeForm.timeline} />
        <ListField label="Decision Makers" items={intakeForm.decisionMakers} />
        <ListField label="Requirements" items={intakeForm.requirements} />
        <ListField label="Pain Points" items={intakeForm.painPoints} />
        <ListField label="Next Steps" items={intakeForm.nextSteps} />
      </dl>
    </div>
  );
}
