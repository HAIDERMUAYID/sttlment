const moment = require('moment-timezone');

const BAGHDAD_TIMEZONE = 'Asia/Baghdad';

// تحويل UTC إلى توقيت بغداد
function toBaghdadTime(utcDate) {
  return moment(utcDate).tz(BAGHDAD_TIMEZONE);
}

// تحويل توقيت بغداد إلى UTC
function toUTC(baghdadDate) {
  return moment.tz(baghdadDate, BAGHDAD_TIMEZONE).utc();
}

// الحصول على تاريخ اليوم بتوقيت بغداد
function getTodayBaghdad() {
  return moment().tz(BAGHDAD_TIMEZONE).format('YYYY-MM-DD');
}

// الحصول على الوقت الحالي بتوقيت بغداد
function getNowBaghdad() {
  return moment().tz(BAGHDAD_TIMEZONE);
}

// تحويل وقت (TIME) من توقيت بغداد إلى UTC للتاريخ المحدد
function combineDateAndTimeBaghdadToUTC(date, timeString) {
  // دعم تنسيقات HH:mm و HH:mm:ss
  const format = timeString.length === 5 ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD HH:mm:ss';
  const baghdadDateTime = moment.tz(`${date} ${timeString}`, format, BAGHDAD_TIMEZONE);
  if (!baghdadDateTime.isValid()) {
    throw new Error(`Invalid date/time format: ${date} ${timeString}`);
  }
  return baghdadDateTime.utc().toDate();
}

module.exports = {
  toBaghdadTime,
  toUTC,
  getTodayBaghdad,
  getNowBaghdad,
  combineDateAndTimeBaghdadToUTC,
  BAGHDAD_TIMEZONE
};