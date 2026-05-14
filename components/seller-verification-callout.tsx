"use client";

import { ShieldCheck, Camera, BadgeCheck } from "lucide-react";

type Props = {
  sellerUsername?: string | null;
  isSellerVerified?: boolean;
  imagesVerifiedAt?: string | null;
};

export function SellerVerificationCallout({
  sellerUsername,
  isSellerVerified,
  imagesVerifiedAt,
}: Props) {
  const identity = Boolean(isSellerVerified);
  const photos = Boolean(imagesVerifiedAt);

  return (
    <div className="rounded-lg border border-gold/25 bg-gold/[0.06] p-4 space-y-3">
      <div className="flex items-center gap-2 text-gold">
        <BadgeCheck className="w-5 h-5 shrink-0" />
        <span className="font-semibold text-sm text-white">Verification details</span>
      </div>
      <p className="text-white/55 text-xs leading-relaxed">
        {sellerUsername ? (
          <>
            Seller <span className="text-white/80">{sellerUsername}</span> — FlipRepublic shows badges when checks
            pass. Below is what each badge means for this listing.
          </>
        ) : (
          "Badges reflect checks completed for this seller and listing."
        )}
      </p>
      <ul className="space-y-2 text-xs text-white/70">
        <li className="flex gap-2">
          <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${identity ? "text-gold" : "text-white/30"}`} />
          <span>
            <span className="text-white/90 font-medium">Identity and seller review</span>
            {" — "}KYC-style review and operations approval before selling.{" "}
            {identity ? (
              <span className="text-gold">Recorded for this account.</span>
            ) : (
              <span className="text-white/45">Not shown or pending for this account.</span>
            )}
          </span>
        </li>
        <li className="flex gap-2">
          <Camera className={`w-4 h-4 shrink-0 mt-0.5 ${photos ? "text-gold" : "text-white/30"}`} />
          <span>
            <span className="text-white/90 font-medium">Listing photo review</span>
            {" — "}Admin confirms multiple angles match the listing.{" "}
            {photos && imagesVerifiedAt ? (
              <span className="text-gold">
                Verified {new Date(imagesVerifiedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}.
              </span>
            ) : (
              <span className="text-white/45">Awaiting or not required for this item.</span>
            )}
          </span>
        </li>
      </ul>
    </div>
  );
}
