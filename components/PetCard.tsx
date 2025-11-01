import Image from "next/image";
import Link from "next/link";
import type { Pet } from "@/lib/types";

export default function PetCard({ pet }: { pet: Pet }) {
  return (
    <div className="card overflow-hidden">
      <div className="relative h-56 w-full bg-gray-100">
        {pet.photo_url ? (
          <Image src={pet.photo_url} alt={pet.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-gray-400">No photo</div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{pet.name}</h3>
          <span className="badge capitalize">{pet.status}</span>
        </div>
        <p className="text-sm text-gray-600">{pet.breed ?? pet.species} • {pet.sex} • {pet.size}</p>
        <p className="text-sm text-gray-600">📍 {pet.location}</p>
        <Link className="btn btn-primary w-full justify-center mt-2" href={`/pets/${pet.id}`}>View details</Link>
      </div>
    </div>
  )
}
