const easeOut = [0.22, 1, 0.36, 1];

export const PLAY_SETUP_BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC3Ju_oFqE7vhueOnoRV2DE6LQMag2sV-_Pn70RrjHxzfqLZgiPul68BJwpAM7qxlxXi4SXV1HBlI0Vr6-OPFAtipgQIO3HCinqZb5P6E3UHWO_V66iLThyOsOHqIXqziVtM4EbDLxlhXKebsUpuKgS3xOTTk3qLLCn_6GXqpsL0cNG3ENY7b86u2QdDjOjmkoVn05I3Y6anpBFu2FYgkm-YBOvmE3aX8VQ6lJiDZfrXIXoCxOtEogai-h9CZROLNDLdeu4QnSTgHo';

/** Variant cha — bọc toàn bộ nội dung setup + banner (stagger). */
export function playSetupParentVariants(reduceMotion) {
  if (reduceMotion) return { hidden: {}, show: {} };
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { duration: 0.32, ease: easeOut, staggerChildren: 0.1, delayChildren: 0.05 },
    },
  };
}

/** Variant con — từng thẻ / section trong setup. */
export function playSetupChildVariants(reduceMotion) {
  if (reduceMotion) return { hidden: {}, show: {} };
  return {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: easeOut } },
  };
}
