"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// Loaded after hydration, never in the route's initial scripts. `ssr: false` is only allowed in a client
// module, which is why this wrapper exists. The pending block only reserves the form's space.
const FinderForm = dynamic(() => import("./finder-form"), {
  ssr: false,
  loading: () => <div className="finder-pending" aria-hidden="true" />,
});

export default function FinderLoader(props: ComponentProps<typeof FinderForm>) {
  return <FinderForm {...props} />;
}
