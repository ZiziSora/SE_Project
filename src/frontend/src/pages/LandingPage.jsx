import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  Menu,
  QrCode,
  Search,
  Sparkles,
  TicketCheck,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import campusImage from "../assets/hcmus.png";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const eventTypes = [
  "HỘI THẢO",
  "WORKSHOP",
  "CUỘC THI",
  "TÌNH NGUYỆN",
  "HỌC THUẬT",
  "CÂU LẠC BỘ",
];

const journeySteps = [
  {
    number: "01",
    title: "Tìm đúng sự kiện dành cho bạn",
    description:
      "Khám phá hoạt động theo sở thích, lĩnh vực và thời gian phù hợp trong một không gian duy nhất.",
    icon: Search,
    image: "https://picsum.photos/seed/university-discovery/1200/900",
  },
  {
    number: "02",
    title: "Đăng ký không còn là cuộc đua",
    description:
      "Theo dõi trạng thái tức thì và tự động vào danh sách chờ khi sự kiện đã đủ chỗ.",
    icon: TicketCheck,
    image: "https://picsum.photos/seed/student-workshop/1200/900",
  },
  {
    number: "03",
    title: "Một mã QR, một lần chạm",
    description:
      "Check-in nhanh, chính xác và lưu lại hành trình tham gia của bạn sau mỗi sự kiện.",
    icon: QrCode,
    image: "https://picsum.photos/seed/campus-checkin/1200/900",
  },
];

const testimonials = [
  {
    quote:
      "Từ lúc biết sự kiện đến khi check-in chỉ còn vài thao tác. Mình không còn phải lục lại các bài đăng cũ để tìm link đăng ký.",
    name: "Minh Anh",
    role: "Sinh viên năm 3",
    image: "https://picsum.photos/seed/student-minh-anh/240/240",
  },
  {
    quote:
      "Danh sách chờ tự động giúp đội ngũ không phải cập nhật từng file Excel. Mọi con số đều rõ ràng ngay khi sự kiện diễn ra.",
    name: "Gia Huy",
    role: "Ban tổ chức CLB học thuật",
    image: "https://picsum.photos/seed/organizer-gia-huy/240/240",
  },
  {
    quote:
      "UniEvent cho mình một nơi để nhìn thấy toàn bộ nhịp sống của trường, từ workshop nhỏ đến những chương trình lớn.",
    name: "Ngọc Hà",
    role: "Sinh viên năm 2",
    image: "https://picsum.photos/seed/student-ngoc-ha/240/240",
  },
];

export default function LandingPage() {
  const pageRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  useGSAP(
    () => {
      const motionPreference = gsap.matchMedia();

      motionPreference.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero-reveal]", {
          y: 42,
          opacity: 0,
          duration: 1.1,
          stagger: 0.12,
          ease: "power3.out",
        });

        gsap.to("[data-reveal-word]", {
          opacity: 1,
          stagger: 0.06,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-reveal-copy]",
            start: "top 78%",
            end: "bottom 52%",
            scrub: true,
          },
        });

        gsap.utils.toArray("[data-journey-card]").forEach((card, index) => {
          gsap.fromTo(
            card,
            { scale: 0.92, opacity: 0.45 },
            {
              scale: 1,
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "top 88%",
                end: "top 28%",
                scrub: true,
              },
            },
          );

          if (index < journeySteps.length - 1) {
            gsap.to(card, {
              scale: 0.96,
              opacity: 0.5,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "bottom 35%",
                end: "bottom 10%",
                scrub: true,
              },
            });
          }
        });
      });

      return () => motionPreference.revert();
    },
    { scope: pageRef },
  );

  const activeTestimonial = testimonials[testimonialIndex];

  const moveTestimonial = (direction) => {
    setTestimonialIndex(
      (currentIndex) =>
        (currentIndex + direction + testimonials.length) % testimonials.length,
    );
  };

  return (
    <main
      ref={pageRef}
      className="w-full max-w-full overflow-x-hidden bg-[#f8f9ff] font-inter text-[#0b1c30]"
    >
      <section className="relative min-h-screen overflow-hidden bg-[#09111f] text-white">
        <img
          src={campusImage}
          alt="Không gian sinh hoạt và học tập tại trường đại học"
          className="absolute inset-0 h-full w-full object-cover opacity-55 contrast-125"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(124,58,237,0.22),transparent_42%),linear-gradient(180deg,rgba(9,17,31,0.38)_0%,rgba(9,17,31,0.74)_68%,#09111f_100%)]" />

        <header className="relative z-30 px-4 pt-5 sm:px-6 lg:px-16">
          <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/15 bg-[#0b1c30]/70 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl sm:px-5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-manrope text-xl font-bold tracking-tight text-white"
              aria-label="UniEvent - Trang chủ"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-[#7c3aed]">
                <GraduationCap className="size-5" aria-hidden="true" />
              </span>
              UniEvent
            </Link>

            <div className="hidden items-center gap-8 md:flex">
              <a
                href="#he-sinh-thai"
                className="text-sm font-semibold text-white/75 transition-colors hover:text-white"
              >
                Hệ sinh thái
              </a>
              <a
                href="#hanh-trinh"
                className="text-sm font-semibold text-white/75 transition-colors hover:text-white"
              >
                Cách hoạt động
              </a>
              <Link
                to="/auth/login"
                className="text-sm font-semibold text-white/75 transition-colors hover:text-white"
              >
                Đăng nhập
              </Link>
              <Link
                to="/auth/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#630ed4]"
              >
                Đăng ký ngay
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <button
              type="button"
              className="grid size-10 place-items-center rounded-lg border border-white/15 text-white md:hidden"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-controls="landing-mobile-menu"
              aria-label={isMenuOpen ? "Đóng menu" : "Mở menu"}
            >
              {isMenuOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </button>
          </nav>

          {isMenuOpen && (
            <div
              id="landing-mobile-menu"
              className="mx-auto mt-2 grid max-w-7xl gap-2 rounded-2xl border border-white/15 bg-[#0b1c30]/95 p-3 shadow-2xl backdrop-blur-xl md:hidden"
            >
              <a
                href="#he-sinh-thai"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
              >
                Hệ sinh thái
              </a>
              <a
                href="#hanh-trinh"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
              >
                Cách hoạt động
              </a>
              <Link
                to="/auth/login"
                className="rounded-lg px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
              >
                Đăng nhập
              </Link>
              <Link
                to="/auth/signup"
                className="rounded-lg bg-[#7c3aed] px-4 py-3 text-center text-sm font-bold text-white"
              >
                Đăng ký ngay
              </Link>
            </div>
          )}
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-92px)] max-w-7xl flex-col items-center justify-center px-5 pb-16 pt-20 text-center sm:px-8 lg:px-16">
          <p
            data-hero-reveal
            className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-violet-200 sm:text-sm"
          >
            Một nhịp sống đại học, trong một nền tảng
          </p>
          <h1
            data-hero-reveal
            className="mt-7 max-w-6xl font-manrope text-[clamp(3rem,7vw,6.8rem)] font-bold leading-[0.95] tracking-[-0.055em] text-balance"
          >
            Biến mỗi sự kiện thành một dấu ấn.
          </h1>
          <p
            data-hero-reveal
            className="mt-7 max-w-2xl text-base leading-7 text-white/72 sm:text-lg sm:leading-8"
          >
            UniEvent kết nối sinh viên, ban tổ chức và nhà trường trong một hệ
            sinh thái khám phá, đăng ký, vận hành và check-in sự kiện liền mạch.
          </p>
          <div
            data-hero-reveal
            className="mt-10 flex w-full max-w-md flex-col justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row"
          >
            <Link
              to="/explore"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-[#7c3aed] px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-violet-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#630ed4]"
            >
              Khám phá sự kiện
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to="/auth/signup"
              className="inline-flex min-h-13 items-center justify-center rounded-lg border border-white/35 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-[#0b1c30]"
            >
              Tạo tài khoản
            </Link>
          </div>
        </div>
      </section>

      <section
        id="he-sinh-thai"
        className="mx-auto max-w-7xl px-5 py-32 sm:px-8 md:py-48 lg:px-16"
      >
        <div className="max-w-5xl">
          <h2 className="font-manrope text-[clamp(2.5rem,5vw,5.2rem)] font-bold leading-[1.02] tracking-[-0.045em] text-[#0b1c30]">
            Mọi hoạt động trong trường, cùng chuyển động trong
            <span
              className="mx-3 inline-block h-[0.72em] w-[1.7em] rounded-full bg-cover bg-center align-middle shadow-lg shadow-violet-200"
              style={{
                backgroundImage:
                  "url(https://picsum.photos/seed/student-community/500/240)",
              }}
              role="img"
              aria-label="Cộng đồng sinh viên"
            />
            một hệ sinh thái.
          </h2>
          <p className="mt-7 max-w-2xl text-base leading-7 text-[#4a4455] sm:text-lg sm:leading-8">
            Không còn biểu mẫu rời rạc, danh sách thủ công hay thông tin trôi
            giữa nhiều kênh. UniEvent đưa toàn bộ hành trình về đúng một nơi.
          </p>
        </div>

        <div className="mt-16 grid grid-flow-dense auto-rows-auto grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-[#ccc3d8]/70 bg-white shadow-[0_24px_80px_rgba(30,41,59,0.08)] md:auto-rows-[240px] md:grid-cols-6">
          <article className="group relative min-h-[500px] overflow-hidden border-b border-[#ccc3d8]/70 md:col-span-3 md:row-span-2 md:min-h-0 md:border-b-0 md:border-r">
            <img
              src="https://picsum.photos/seed/campus-event-crowd/1200/1200"
              alt="Sinh viên tham gia hoạt động trong khuôn viên trường"
              className="absolute inset-0 h-full w-full object-cover contrast-125 transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#09111f] via-[#09111f]/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-10">
              <Sparkles className="mb-5 size-7 text-violet-300" aria-hidden="true" />
              <h3 className="max-w-md font-manrope text-3xl font-bold tracking-tight sm:text-4xl">
                Khám phá đúng điều bạn quan tâm
              </h3>
              <p className="mt-4 max-w-md leading-7 text-white/75">
                Tìm kiếm, lọc và nhận gợi ý hoạt động phù hợp với hành trình
                phát triển của riêng bạn.
              </p>
            </div>
          </article>

          <article className="group relative min-h-[260px] overflow-hidden border-b border-[#ccc3d8]/70 bg-[#7c3aed] p-7 text-white md:col-span-3 md:min-h-0 sm:p-9">
            <div className="absolute -right-14 -top-20 size-56 rounded-full border-[40px] border-white/10 transition-transform duration-700 ease-out group-hover:scale-105" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-5">
                <CalendarCheck className="size-8" aria-hidden="true" />
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-violet-100">
                  Trạng thái thời gian thực
                </span>
              </div>
              <div>
                <h3 className="font-manrope text-2xl font-bold tracking-tight sm:text-3xl">
                  Đăng ký minh bạch, danh sách chờ tự động
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100">
                  Biết ngay bạn đã có chỗ, đang chờ hay vừa được xác nhận.
                </p>
              </div>
            </div>
          </article>

          <article className="group min-h-[260px] overflow-hidden border-b border-[#ccc3d8]/70 bg-[#f5f3ff] p-7 md:col-span-2 md:min-h-0 md:border-b-0 md:border-r sm:p-8">
            <div className="flex h-full flex-col justify-between">
              <div className="grid size-12 place-items-center rounded-xl bg-white text-[#7c3aed] shadow-sm transition-transform duration-700 ease-out group-hover:scale-105">
                <QrCode className="size-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-manrope text-2xl font-bold">Check-in bằng QR</h3>
                <p className="mt-2 text-sm leading-6 text-[#4a4455]">
                  Nhanh hơn, chính xác hơn, không trùng lặp.
                </p>
              </div>
            </div>
          </article>

          <article className="group min-h-[260px] overflow-hidden bg-[#d8e3fb] p-7 md:col-span-1 md:min-h-0 sm:p-8">
            <div className="flex h-full flex-col justify-between">
              <Users
                className="size-8 text-[#0b1c30] transition-transform duration-700 ease-out group-hover:scale-105"
                aria-hidden="true"
              />
              <div>
                <p className="font-manrope text-4xl font-bold tracking-tight">3 vai trò</p>
                <p className="mt-2 text-sm leading-6 text-[#4a4455]">
                  Sinh viên, ban tổ chức và quản trị viên cùng kết nối.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="border-y border-[#ccc3d8]/60 bg-[#0b1c30] py-6 text-white">
        <div className="landing-marquee flex w-max items-center">
          {[...eventTypes, ...eventTypes].map((eventType, index) => (
            <div
              key={`${eventType}-${index}`}
              className="flex shrink-0 items-center gap-8 px-4 font-manrope text-lg font-bold tracking-[0.08em] sm:text-xl"
              aria-hidden={index >= eventTypes.length}
            >
              {eventType}
              <span className="size-2 rotate-45 bg-[#a78bfa]" />
            </div>
          ))}
        </div>
      </section>

      <section
        id="hanh-trinh"
        className="bg-[#0b1c30] px-5 py-32 text-white sm:px-8 md:py-48 lg:px-16"
      >
        <div className="mx-auto max-w-7xl">
          <p
            data-reveal-copy
            className="max-w-6xl font-manrope text-[clamp(2.25rem,5vw,5rem)] font-bold leading-[1.08] tracking-[-0.04em]"
          >
            {"Từ khoảnh khắc tìm thấy một hoạt động phù hợp đến lúc bước qua cổng check-in, UniEvent giữ mọi trải nghiệm luôn rõ ràng, liền mạch và đáng nhớ."
              .split(" ")
              .map((word, index) => (
                <span
                  key={`${word}-${index}`}
                  data-reveal-word
                  className="mr-[0.24em] inline-block opacity-10"
                >
                  {word}
                </span>
              ))}
          </p>

          <div className="mt-28 space-y-8">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.number}
                  data-journey-card
                  className="sticky top-5 grid min-h-[72vh] overflow-hidden rounded-2xl border border-white/12 bg-[#111d31] shadow-2xl shadow-black/35 lg:grid-cols-[0.9fr_1.1fr]"
                  style={{ top: `${20 + index * 18}px` }}
                >
                  <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-14">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm tracking-[0.18em] text-violet-300">
                        {step.number}
                      </span>
                      <span className="grid size-12 place-items-center rounded-xl bg-[#7c3aed] text-white">
                        <Icon className="size-6" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="mt-20 max-w-xl">
                      <h3 className="font-manrope text-4xl font-bold leading-tight tracking-[-0.035em] sm:text-5xl">
                        {step.title}
                      </h3>
                      <p className="mt-5 max-w-lg text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <div className="group min-h-[360px] overflow-hidden lg:min-h-0">
                    <img
                      src={step.image}
                      alt=""
                      className="h-full w-full object-cover opacity-90 contrast-125 transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-32 sm:px-8 md:py-48 lg:px-16">
        <div className="grid items-end gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <h2 className="font-manrope text-[clamp(2.5rem,5vw,4.8rem)] font-bold leading-[1.02] tracking-[-0.045em]">
              Được tạo ra cho nhịp sống thật của sinh viên.
            </h2>
            <div className="mt-10 flex items-center gap-3">
              <button
                type="button"
                onClick={() => moveTestimonial(-1)}
                className="grid size-12 place-items-center rounded-full border border-[#ccc3d8] bg-white text-[#0b1c30] transition duration-200 hover:-translate-y-0.5 hover:border-[#7c3aed] hover:text-[#7c3aed]"
                aria-label="Ý kiến trước"
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => moveTestimonial(1)}
                className="grid size-12 place-items-center rounded-full bg-[#7c3aed] text-white shadow-lg shadow-violet-200 transition duration-200 hover:-translate-y-0.5 hover:bg-[#630ed4]"
                aria-label="Ý kiến tiếp theo"
              >
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#ccc3d8]/70 bg-white p-7 shadow-[0_24px_80px_rgba(30,41,59,0.08)] sm:p-10 lg:p-14">
            <CheckCircle2 className="size-8 text-[#7c3aed]" aria-hidden="true" />
            <blockquote className="mt-8 font-manrope text-2xl font-semibold leading-relaxed tracking-[-0.025em] text-[#0b1c30] sm:text-3xl">
              “{activeTestimonial.quote}”
            </blockquote>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-3">
                {testimonials.map((testimonial, index) => (
                  <img
                    key={testimonial.name}
                    src={testimonial.image}
                    alt=""
                    className={`size-12 rounded-full border-2 border-white object-cover transition duration-300 ${
                      index === testimonialIndex
                        ? "z-10 scale-110 ring-2 ring-[#7c3aed] ring-offset-2"
                        : "opacity-55 grayscale"
                    }`}
                  />
                ))}
              </div>
              <div>
                <p className="font-manrope font-bold text-[#0b1c30]">
                  {activeTestimonial.name}
                </p>
                <p className="mt-0.5 text-sm text-[#4a4455]">
                  {activeTestimonial.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 sm:px-8 lg:px-16">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-[#7c3aed] px-6 py-24 text-center text-white sm:px-10 md:py-32">
          <div className="absolute -left-20 -top-28 size-80 rounded-full border-[52px] border-white/10" />
          <div className="absolute -bottom-32 -right-16 size-96 rounded-full border-[64px] border-white/10" />
          <div className="relative mx-auto max-w-4xl">
            <h2 className="font-manrope text-[clamp(2.7rem,6vw,6rem)] font-bold leading-[0.98] tracking-[-0.05em]">
              Đừng chỉ nghe về sự kiện tiếp theo.
            </h2>
            <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-violet-100 sm:text-lg">
              Hãy là người có mặt, kết nối và tạo nên trải nghiệm đó cùng
              cộng đồng UniEvent.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/auth/signup"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-[#4c1d95] transition duration-200 hover:-translate-y-0.5 hover:bg-violet-50"
              >
                Bắt đầu với UniEvent
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                to="/explore"
                className="inline-flex min-h-13 items-center justify-center rounded-lg border border-white/35 px-7 py-3.5 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/10"
              >
                Xem các sự kiện
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#f8f9ff] px-5 py-12 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 border-t border-[#ccc3d8]/70 pt-9 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-manrope text-xl font-bold tracking-tight text-[#0b1c30]"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-[#7c3aed] text-white">
              <GraduationCap className="size-5" aria-hidden="true" />
            </span>
            UniEvent
          </Link>
          <div className="flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-[#4a4455]">
            <Link to="/explore" className="hover:text-[#7c3aed]">
              Khám phá
            </Link>
            <Link to="/auth/login" className="hover:text-[#7c3aed]">
              Đăng nhập
            </Link>
            <Link to="/auth/signup" className="hover:text-[#7c3aed]">
              Đăng ký
            </Link>
          </div>
          <p className="text-sm text-[#7b7487]">© 2026 UniEvent</p>
        </div>
      </footer>
    </main>
  );
}
