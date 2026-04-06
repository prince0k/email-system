"use client";

import SubjectLineManager from "@/components/SubjectLineManager";

export default function SubjectLinesPage({ params }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Subject Lines</h1>
        <p className="text-sm text-gray-400">
          Subject lines linked to this offer
        </p>
      </div>

      <SubjectLineManager offerId={params.offerId} />
    </div>
  );
}