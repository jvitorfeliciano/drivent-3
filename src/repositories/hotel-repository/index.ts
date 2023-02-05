import { prisma } from "@/config";

async function findMany() {
  return await prisma.hotel.findMany();
}

const hotelRepository = {
  findMany,
};

export default hotelRepository;
