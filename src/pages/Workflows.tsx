import { Camera, CheckSquare2, Clock3, FileText, MessageCircle, Mic2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { WORKFLOW_TEMPLATES } from '../data/workflowTemplates';

const icons = {
  camera: Camera,
  checkSquare: CheckSquare2,
  clock: Clock3,
  fileText: FileText,
  messageCircle: MessageCircle,
  mic: Mic2,
};

export function Workflows() {
  return (
    <div className="space-y-5 pt-4">
      <header>
        <p className="text-sm font-semibold text-primary">Reusable app seeds</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Workflows</h1>
      </header>

      <section className="grid gap-3">
        {WORKFLOW_TEMPLATES.map((workflow) => {
          const WorkflowIcon = icons[workflow.icon];

          return (
            <Link key={workflow.id} to={`/workflows/${workflow.id}`} className="block">
              <Card className="p-4 rounded-[1.25rem] transition active:scale-[0.99]">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
                    <WorkflowIcon size={22} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-bold text-slate-950">{workflow.title}</h2>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                        {workflow.state}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{workflow.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
