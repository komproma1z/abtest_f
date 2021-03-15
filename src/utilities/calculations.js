import * as dayjs from 'dayjs';

export const calculateRollingRetention = (x, items) => {
  const usersLoggedAfterX = items.filter(item => {
    return getDatesDifference(item.lastActivityDate, item.createdDate) >= x;
  });

  const usersRegisteredAfterX = items.filter(item => {
    return getDatesDifference(dayjs(), item.createdDate) >= x;
  });

  const retention = (usersLoggedAfterX.length / usersRegisteredAfterX.length * 100).toFixed(2);

  return `${retention}%`;
}

export const getDatesDifference = (date1, date2) => {
  date1 = dayjs(date1).format("YYYY-MM-DD")
  date2 = dayjs(date2).format("YYYY-MM-DD")
  return dayjs(date1).diff(date2)/(60*60*24*1000);
};