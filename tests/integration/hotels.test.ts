import app, { init } from "@/app";
import { prisma } from "@/config";
import faker from "@faker-js/faker";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import { createEnrollmentWithAddress, createUser, createTicketType, createTicket, createHotel } from "../factories";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /hotels", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/hotels");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with 404 when there is no enrollment", async () => {
      const token = await generateValidToken();

      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 404 when there is no ticket for the user", async () => {
      const user = await createUser();
      await createEnrollmentWithAddress(user);
      const token = await generateValidToken(user);

      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 402 when the ticket is not paid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketType();
      await createTicket(enrollment.id, ticketType.id, "RESERVED");

      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
    });

    it("should respond with status 402 when the ticketType does not include hotel", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await prisma.ticketType.create({
        data: {
          name: faker.name.findName(),
          price: faker.datatype.number(),
          isRemote: faker.datatype.boolean(),
          includesHotel: false,
        },
      });

      await createTicket(enrollment.id, ticketType.id, "RESERVED");

      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
    });

    it("should respond with status 402 when the ticketType is remote", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await prisma.ticketType.create({
        data: {
          name: faker.name.findName(),
          price: faker.datatype.number(),
          isRemote: true,
          includesHotel: faker.datatype.boolean(),
        },
      });

      await createTicket(enrollment.id, ticketType.id, "RESERVED");

      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
    });

    it("should respond with status 404 when any hotel is not found", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await prisma.ticketType.create({
        data: {
          name: faker.name.findName(),
          price: faker.datatype.number(),
          isRemote: false,
          includesHotel: true,
        },
      });

      await createTicket(enrollment.id, ticketType.id, "PAID");

      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 and an array with the hotels informations when all the conditions are met", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await prisma.ticketType.create({
        data: {
          name: faker.name.findName(),
          price: faker.datatype.number(),
          isRemote: false,
          includesHotel: true,
        },
      });
      await createTicket(enrollment.id, ticketType.id, "PAID");
      await createHotel();

      const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            image: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        ]),
      );
    });
  });
});

describe("GET /hotels/:hotelId", () => {
  it("should respond with status 401 if no token is given", async () => {
    const hotel = await createHotel();
    const response = await server.get(`/hotels/${hotel.id}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const hotel = await createHotel();
    const token = faker.lorem.word();

    const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const hotel = await createHotel();
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 404 when there is no enrollment", async () => {
      const hotel = await createHotel();
      const token = await generateValidToken();

      const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 404 when there is no ticket for the user", async () => {
      const hotel = await createHotel();
      const user = await createUser();
      await createEnrollmentWithAddress(user);
      const token = await generateValidToken(user);

      const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 402 when the ticket is not paid", async () => {
      const hotel = await createHotel();
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketType();
      await createTicket(enrollment.id, ticketType.id, "RESERVED");

      const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
    });

    it("should respond with status 402 when the ticketType does not include hotel", async () => {
      const hotel = await createHotel();
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await prisma.ticketType.create({
        data: {
          name: faker.name.findName(),
          price: faker.datatype.number(),
          isRemote: faker.datatype.boolean(),
          includesHotel: false,
        },
      });

      await createTicket(enrollment.id, ticketType.id, "RESERVED");

      const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
    });

    it("should respond with status 402 when the ticketType is remote", async () => {
      const hotel = await createHotel();
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await prisma.ticketType.create({
        data: {
          name: faker.name.findName(),
          price: faker.datatype.number(),
          isRemote: true,
          includesHotel: faker.datatype.boolean(),
        },
      });

      await createTicket(enrollment.id, ticketType.id, "RESERVED");

      const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
    });

    it("should respond with status 404 when hotel doesn't exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await prisma.ticketType.create({
        data: {
          name: faker.name.findName(),
          price: faker.datatype.number(),
          isRemote: false,
          includesHotel: true,
        },
      });

      await createTicket(enrollment.id, ticketType.id, "PAID");

      const response = await server.get("/hotels/000").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it("should respond with status 200 and an array with the hotel informations when all the conditions are met", async () => {
      const hotel = await createHotel();
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await prisma.ticketType.create({
        data: {
          name: faker.name.findName(),
          price: faker.datatype.number(),
          isRemote: false,
          includesHotel: true,
        },
      });
      await createTicket(enrollment.id, ticketType.id, "PAID");
      await createHotel();

      const response = await server.get(`/hotels/${hotel.id}`).set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          image: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          Rooms: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number),
              name: expect.any(String),
              capacity: expect.any(Number),
              hotelId: expect.any(Number),
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            }),
          ]),
        }),
      );
    });
  });
});
