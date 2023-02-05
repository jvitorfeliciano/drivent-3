import faker from "@faker-js/faker";
import { prisma } from "@/config";

export async function createHotel() {
  await prisma.hotel.create({
    data: {
      name: faker.company.companyName(),
      image: faker.image.business(),
      Rooms: {
        create: [
          {
            name: faker.company.bsAdjective(),
            capacity: 0,
          },
          {
            name: faker.company.bsAdjective(),
            capacity: 1,
          },
        ],
      },
    },
  });
}
