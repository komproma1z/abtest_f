import * as dayjs from 'dayjs';

export const calculateRollingRetention = (x, items) => {
  const usersLoggedAfterX = items.filter(item => {
    return getDatesDifference(item.lastActivityDate, item.createdDate) >= x;
  });

  const usersRegisteredBeforeX = items.filter(item => {
    return getDatesDifference(dayjs(), item.createdDate) >= x;
  });

  const retention = (usersLoggedAfterX.length / usersRegisteredBeforeX.length * 100).toFixed(2);

  return `${retention}%`;
}

export const getDatesDifference = (date1, date2) => Math.floor(dayjs(date1).diff(date2)/(60*60*24*1000));