import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { CtaBand } from "@/components/templates/cta-band";
import { PageHeader } from "@/components/templates/page-header";
import {
  CONSOLE_ARCHETYPES,
  PUBLIC_ARCHETYPES,
} from "@/components/templates/archetypes";
import archetypes from "../../../docs/design-system/archetypes.json";
import { LabFrame } from "./lab-frame";

type Contract = typeof archetypes.public.archetypes;

export function ArchetypesSection() {
  const site = createEmergencyPublicSite();
  const rows = Object.entries(PUBLIC_ARCHETYPES) as Array<
    [keyof Contract, (typeof PUBLIC_ARCHETYPES)[keyof typeof PUBLIC_ARCHETYPES]]
  >;

  return (
    <div className="flex flex-col gap-8">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Page archetypes and their templates
        </caption>
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4">Archetype</th>
            <th className="py-2 pr-4">Template</th>
            <th className="py-2 pr-4">Routes</th>
            <th className="py-2">Page header · CtaBand</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, archetype]) => {
            const contract = archetypes.public.archetypes[id] as {
              routes?: string[];
              pageHeader: string | boolean;
              ctaBand: boolean;
            };
            return (
              <tr key={id} className="border-b align-top">
                <td className="py-2 pr-4 font-mono">
                  {id} {archetype.name}
                </td>
                <td className="py-2 pr-4 font-mono">{archetype.template}</td>
                <td className="py-2 pr-4 font-mono">
                  {(contract.routes ?? ["(discovered detail records)"]).join(
                    ", "
                  )}
                </td>
                <td className="py-2">
                  {String(contract.pageHeader)} ·{" "}
                  {contract.ctaBand ? "yes" : "no"}
                </td>
              </tr>
            );
          })}
          {Object.entries(CONSOLE_ARCHETYPES).map(([id, archetype]) => (
            <tr key={id} className="border-b align-top">
              <td className="py-2 pr-4 font-mono">
                {id} {archetype.name}
              </td>
              <td className="py-2 pr-4 font-mono">{archetype.template}</td>
              <td className="py-2 pr-4 font-mono">/admin (from Phase 7)</td>
              <td className="py-2">stubbed</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid gap-6 lg:grid-cols-2">
        <LabFrame title="PageHeader · index" className="p-0">
          <PageHeader
            level="index"
            title="Problems solved"
            lede="Case files that start with the business problem."
            path={[
              { index: 1, name: "Home", href: "/" },
              { index: 2, name: "case-studies", href: "/case-studies" },
            ]}
          />
        </LabFrame>
        <LabFrame title="PageHeader · detail" className="p-0">
          <PageHeader
            level="detail"
            title="Safe in-place migration of a live database"
            lede="Constraints, architecture and result."
            path={[
              { index: 1, name: "Home", href: "/" },
              { index: 2, name: "case-studies", href: "/case-studies" },
              { index: 3, name: "safe-migration" },
            ]}
          />
        </LabFrame>
      </div>
      <LabFrame
        title="CtaBand (opposite tone, closes every page except contact and documents)"
        className="p-0"
      >
        <CtaBand site={site} />
      </LabFrame>
    </div>
  );
}
