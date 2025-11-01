"use client";

import { useFormStatus } from "react-dom";

export default function ManageApplicationButtons({
  action,
  applicationId,
  returnTo,
  currentStatus,
}: {
  action: (formData: FormData) => void | Promise<void>;
  applicationId: string;
  returnTo: string;
  currentStatus: "pending" | "approved" | "rejected";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentStatus === "pending" && (
        <>
          <FormButton
            action={action}
            applicationId={applicationId}
            nextStatus="approved"
            returnTo={returnTo}
            label="Approve"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          />
          <FormButton
            action={action}
            applicationId={applicationId}
            nextStatus="rejected"
            returnTo={returnTo}
            label="Reject"
            className="bg-rose-600 hover:bg-rose-700 text-white"
          />
        </>
      )}

      {currentStatus === "approved" && (
        <>
          <FormButton
            action={action}
            applicationId={applicationId}
            nextStatus="pending"
            returnTo={returnTo}
            label="Cancel approval"
            className="border px-3 py-1.5 hover:bg-gray-50"
          />
          <FormButton
            action={action}
            applicationId={applicationId}
            nextStatus="rejected"
            returnTo={returnTo}
            label="Reject"
            className="bg-rose-600 hover:bg-rose-700 text-white"
          />
        </>
      )}

      {currentStatus === "rejected" && (
        <>
          <FormButton
            action={action}
            applicationId={applicationId}
            nextStatus="pending"
            returnTo={returnTo}
            label="Reopen"
            className="border px-3 py-1.5 hover:bg-gray-50"
          />
          <FormButton
            action={action}
            applicationId={applicationId}
            nextStatus="approved"
            returnTo={returnTo}
            label="Approve"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          />
        </>
      )}
    </div>
  );
}

function FormButton({
  action,
  applicationId,
  nextStatus,
  returnTo,
  label,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  applicationId: string;
  nextStatus: "approved" | "rejected" | "pending";
  returnTo: string;
  label: string;
  className?: string;
}) {
  return (
    <form action={action} method="post">
      <input type="hidden" name="application_id" value={applicationId} />
      <input type="hidden" name="next_status" value={nextStatus} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Submit label={label} className={className} />
    </form>
  );
}

function Submit({ label, className }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed ${className || ""}`}
    >
      {pending ? `${label}…` : label}
    </button>
  );
}
