import { prisma } from "@/config";

async function findMany() {
  return await prisma.hotel.findMany();
}

async function findUnique(id: number) {
  return await prisma.hotel.findUnique({
    where: {
      id,
    },
    include: {
      Rooms: true,
    },
  });
}

const hotelRepository = {
  findMany,
  findUnique,
};

export default hotelRepository;
