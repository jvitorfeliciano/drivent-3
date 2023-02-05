import { notFoundError, PaymentRequiredError } from "@/errors";
import enrollmentRepository from "@/repositories/enrollment-repository";
import hotelRepository from "@/repositories/hotel-repository";
import ticketRepository from "@/repositories/ticket-repository";
import { TicketStatus } from "@prisma/client";

async function checkEnrollment(userId: number): Promise<number> {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);

  if (!enrollment) {
    throw notFoundError();
  }

  return enrollment.id;
}

async function checkTicket(enrollmentId: number) {
  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollmentId);

  if (!ticket) {
    throw notFoundError();
  }

  if (ticket.status !== TicketStatus.PAID || !ticket.TicketType.includesHotel || ticket.TicketType.isRemote) {
    throw PaymentRequiredError();
  }
}

async function getHotels(userId: number) {
  const enrollmentId = await checkEnrollment(userId);

  await checkTicket(enrollmentId);

  const hotels = await hotelRepository.findMany();

  if (hotels.length === 0) {
    throw notFoundError();
  }

  return hotels;
}

const hotelService = {
  getHotels,
};

export default hotelService;
