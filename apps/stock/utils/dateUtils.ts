/**
 * 格式化日期为本地字符串
 * @param dateString ISO日期字符串
 * @returns 格式化后的日期字符串
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';

  const date = new Date(dateString);

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return '';
  }

  // 格式化为：YYYY-MM-DD HH:mm
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * 获取当前日期的ISO字符串
 * @returns ISO日期字符串
 */
export const getCurrentDateISOString = (): string => {
  return new Date().toISOString();
};

/**
 * 计算两个日期之间的天数差
 * @param date1 第一个日期
 * @param date2 第二个日期
 * @returns 天数差
 */
export const daysBetween = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000; // 一天的毫秒数
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.round(diffTime / oneDay);
};

/**
 * 检查日期是否过期
 * @param dateString ISO日期字符串
 * @returns 是否过期
 */
export const isExpired = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();

  // 清除时间部分，只比较日期
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return date < today;
};

/**
 * 检查日期是否即将过期
 * @param dateString ISO日期字符串
 * @param daysThreshold 过期天数阈值
 * @returns 是否即将过期
 */
export const isExpiringSoon = (dateString: string, daysThreshold: number = 7): boolean => {
  const date = new Date(dateString);
  const today = new Date();

  // 清除时间部分，只比较日期
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return !isExpired(dateString) && daysBetween(date, today) <= daysThreshold;
};
