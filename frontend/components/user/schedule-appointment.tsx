"use client"

import { useState, useMemo } from "react"
import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Timer,
  MapPin,
  ChevronDown,
} from "lucide-react"

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
]

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function ScheduleAppointment() {
  const { services, bookAppointment, getUserAppointments, getServiceById } = useApp()

  const openServices = services.filter((s) => s.isOpen)
  const userAppointments = getUserAppointments()
  const upcomingAppointments = userAppointments.filter((a) => a.status === "upcoming")

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<number | null>(today.getDate())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<string>(openServices[0]?.id ?? "")
  const [booked, setBooked] = useState(false)

  const selectedService = getServiceById(selectedServiceId)

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [daysInMonth, firstDay])

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
    setSelectedDate(null)
    setSelectedTime(null)
    setBooked(false)
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
    setSelectedDate(null)
    setSelectedTime(null)
    setBooked(false)
  }

  function isDayPast(day: number) {
    const d = new Date(currentYear, currentMonth, day)
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return d < todayDate
  }

  function isToday(day: number) {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  const formattedDate = selectedDate
    ? `${selectedDate} ${MONTH_NAMES[currentMonth].slice(0, 3)}, ${currentYear}`
    : null

  function handleBook() {
    if (!selectedDate || !selectedTime || !selectedServiceId) return
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`
    bookAppointment(selectedServiceId, dateStr, selectedTime)
    setBooked(true)
  }

  function handleNewBooking() {
    setSelectedDate(null)
    setSelectedTime(null)
    setBooked(false)
  }

  // Determine which time slots are already booked for this service on this date
  const bookedSlots = useMemo(() => {
    if (!selectedDate || !selectedServiceId) return new Set<string>()
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`
    return new Set(
      userAppointments
        .filter((a) => a.serviceId === selectedServiceId && a.date === dateStr && a.status === "upcoming")
        .map((a) => a.time)
    )
  }, [selectedDate, selectedServiceId, currentYear, currentMonth, userAppointments])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule Appointment</h1>
          <p className="text-muted-foreground mt-1">Pick a date, time, and location (Houston, Pasadena, Sugar Land) to book your appointment.</p>
        </div>
        {upcomingAppointments.length > 0 && (
          <Badge className="bg-primary/10 text-primary border border-primary/20 self-start sm:self-auto">
            {upcomingAppointments.length} upcoming
          </Badge>
        )}
      </div>

      {/* Service selector */}
      {openServices.length > 1 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="service-select">Select Location</label>
          <div className="relative">
            <select
              id="service-select"
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value)
                setBooked(false)
              }}
              className="w-full sm:w-72 appearance-none rounded-lg border border-border bg-card px-3 py-2.5 pr-9 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {openServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.zipCode}) - {s.expectedDuration} min
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Main layout: Calendar + Time Picker + Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1fr]">
        {/* Calendar */}
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span className="text-base font-semibold text-foreground">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="py-2" />
                }
                const past = isDayPast(day)
                const todayMark = isToday(day)
                const selected = selectedDate === day
                return (
                  <button
                    key={day}
                    disabled={past}
                    onClick={() => {
                      setSelectedDate(day)
                      setSelectedTime(null)
                      setBooked(false)
                    }}
                    className={`flex h-10 w-full items-center justify-center rounded-full text-sm transition-colors ${
                      past
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : selected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : todayMark
                            ? "bg-primary/15 text-primary font-medium hover:bg-primary/25"
                            : "text-foreground hover:bg-accent"
                    }`}
                    aria-label={`${day} ${MONTH_NAMES[currentMonth]} ${currentYear}`}
                    aria-pressed={selected}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Time Picker */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">Pick a time</p>
          <div className="relative flex flex-col items-center gap-1.5">
            {/* Vertical accent line */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-primary/20" />
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedTime === slot
              const isBooked = bookedSlots.has(slot)
              return (
                <button
                  key={slot}
                  disabled={!selectedDate || isBooked}
                  onClick={() => {
                    setSelectedTime(slot)
                    setBooked(false)
                  }}
                  className={`relative flex h-10 w-20 items-center justify-center rounded-xl text-sm font-medium transition-all ${
                    !selectedDate
                      ? "text-muted-foreground/40 cursor-not-allowed bg-muted/50"
                      : isBooked
                        ? "text-muted-foreground/40 bg-muted/50 cursor-not-allowed line-through"
                        : isSelected
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "bg-card text-foreground border border-border hover:border-primary/40 hover:bg-primary/5"
                  }`}
                  aria-label={`Select time ${slot}`}
                  aria-pressed={isSelected}
                >
                  {isSelected && (
                    <span className="absolute -left-[7px] h-3 w-3 rounded-full bg-primary ring-2 ring-card" />
                  )}
                  {slot}
                </button>
              )
            })}
          </div>
        </div>

        {/* Appointment Summary Card */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-primary px-6 pt-6 pb-5">
            {selectedService ? (
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card/20 text-primary-foreground text-lg font-bold">
                  {selectedService.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-primary-foreground/70 text-xs">
                    <MapPin className="h-3 w-3" />
                    <span>QueueSmart Locations</span>
                  </div>
                  <h3 className="text-lg font-bold text-primary-foreground mt-0.5">{selectedService.name} ({selectedService.zipCode})</h3>
                  <p className="text-primary-foreground/70 text-xs">{selectedService.description}</p>
                </div>
              </div>
            ) : (
              <div className="text-primary-foreground/70 text-sm">Select a location to see details</div>
            )}
          </div>
          <CardContent className="p-6">
            {booked ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                  <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">Appointment Booked!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formattedDate} at {selectedTime}
                  </p>
                </div>
                <Button variant="outline" onClick={handleNewBooking} className="mt-2">
                  Book Another
                </Button>
              </div>
            ) : (
              <>
                {selectedService && (
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                    {selectedService.description}
                  </p>
                )}

                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {formattedDate ?? "Select a date"}
                      </p>
                      <p className="text-xs text-muted-foreground">Date</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedTime ?? "Select a time"}
                      </p>
                      <p className="text-xs text-muted-foreground">Time</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Timer className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedService ? `${selectedService.expectedDuration} min` : "--"}
                      </p>
                      <p className="text-xs text-muted-foreground">Duration</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleBook}
                  disabled={!selectedDate || !selectedTime || !selectedServiceId}
                  className="mt-6 w-full"
                  size="lg"
                >
                  Book appointment
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">Your Upcoming Appointments</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingAppointments.map((apt) => {
              const svc = getServiceById(apt.serviceId)
              return (
                <Card key={apt.id}>
                  <CardContent className="flex items-start justify-between p-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-foreground">{svc ? `${svc.name} (${svc.zipCode})` : "Location"}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {apt.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {apt.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {apt.duration}m
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs shrink-0">
                      Upcoming
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
