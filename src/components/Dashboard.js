import { useState, useEffect, useRef } from 'react';

import * as dayjs from 'dayjs';
import '../../node_modules/react-vis/dist/style.css';
import {
  FlexibleWidthXYPlot, 
  VerticalGridLines,
  HorizontalGridLines,
  VerticalBarSeries,
  XAxis,
  YAxis
} from 'react-vis';

import '../styles/Dashboard.css';

const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

function Dashboard() {
	const [error, setError] = useState(null);
	const [isLoaded, setIsLoaded] = useState(false);
	const [items, setItems] = useState([]);
	const [modifiedItemsIds, setModifiedItemsIds] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartDataCalculated, setChartDataCalculated] = useState(false);
  const [rollingRetention, setRollingRetention] = useState(null);

  const chartRef = useRef(null);
  const userRef = useRef(null);

  const handleOnChange = (e, field) => {
    let index = items.findIndex(item => item.id === parseInt(e.target.name));
    if (!modifiedItemsIds.includes(items[index].id)) {
      setModifiedItemsIds([...modifiedItemsIds, items[index].id]);
    }
    items[index][field] = dayjs((dayjs(e.target.value, "DD.MM.YYYY").valueOf()+86400000)).format();
    setItems(items);
  }

  const handleSave = () => {
    for (let itemId of modifiedItemsIds) {

      const item = items.find(item => item.id === itemId);

      fetch(`https://abtestapiak.herokuapp.com/api/users/${itemId}`, {
        method: "PUT",
        body: JSON.stringify(item),
        headers: {
          "Content-Type": "application/json"
        }
      })
      .catch(error => console.log(error));
    }
  }

  const handleCalculate = async () => {
    const data = items.map(item => {
      const obj = {};
      obj.x = `id${item.id}`;
      obj.y = getDatesDifference(item.lastActivityDate, item.createdDate);
      return obj;
    });
    setChartData(data);
    setRollingRetention(calculateRollingRetention(7));
    await setChartDataCalculated(true);
    return chartRef.current.scrollIntoView({behavior: 'smooth'});
  }

  const handleAdd = async () => {
    const newUser = {createdDate: dayjs(), lastActivityDate: dayjs()};

    setChartDataCalculated(false);
    setRollingRetention(null);

    await fetch("https://abtestapiak.herokuapp.com/api/users", {
      method: "POST",
      body: JSON.stringify(newUser),
      headers: {
        "Content-Type": "application/json"
      }
    })
    .then(res => res.json())
    .then(result => setItems([...items, result.value]))
    .catch(error => console.log(error));

    return userRef.current.scrollIntoView({behavior: 'smooth'});
  }

  const calculateRollingRetention = x => {
    const usersLoggedAfterX = items.filter(item => {
      return getDatesDifference(item.lastActivityDate, item.createdDate) >= x;
    });

    const usersRegisteredBeforeX = items.filter(item => {
      return getDatesDifference(dayjs(), item.createdDate) >= x;
    });

    const retention = (usersLoggedAfterX.length / usersRegisteredBeforeX.length * 100).toFixed(2)

    return `${retention}%`;
  }

  const getDatesDifference = (date1, date2) => dayjs(date1).diff(date2)/(60*60*24*1000);

	useEffect(() => {
		fetch("https://abtestapiak.herokuapp.com/api/users")
			.then(res => res.json())
			.then(
				(result) => {
					setIsLoaded(true);
					setItems(result);
				},
					(error) => {
					setIsLoaded(true);
					setError(error);
				}
			)
	}, []);

	if (error) {
		return <div>Error: {error.message}</div>;
	} else if (!isLoaded) {
		return <div>Loading...</div>;
	} else {
		return (
      <div className="Wrapper">
        <table className="Table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Date Registration</th>
              <th>Date Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} ref={userRef}>
                <td>{item.id}</td>
                <td>
                  <input
                    name={item.id}
                    defaultValue={dayjs(item.createdDate).format("DD.MM.YYYY")}
                    maxLength="10"
                    pattern="[0-9]{2}\.[0-9]{2}\.[0-9]{4}"
                    onChange={e => handleOnChange(e, "createdDate")}
                  />
                </td>
                <td>
                  <input
                    name={item.id}
                    defaultValue={dayjs(item.lastActivityDate).format("DD.MM.YYYY")}
                    maxLength="10"
                    pattern="[0-9]{2}\.[0-9]{2}\.[0-9]{4}"
                    onChange={e => handleOnChange(e, "lastActivityDate")}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="Buttons">
          <span onClick={handleAdd}>Add user</span>
          <span onClick={handleSave}>Save</span>
          <span onClick={handleCalculate}>Calculate</span>
        </div>
        <p className="RollingRetention">
          {
          rollingRetention === null 
          ? null 
          : `Rolling retention 7 days: ${rollingRetention}`
          }
        </p>
        {
          chartDataCalculated
          ? <div ref={chartRef}>
          <FlexibleWidthXYPlot 
            className="clustered-stacked-bar-chart-example"
            xType="ordinal"
            stackBy="y"
            height={400}
          >
            <VerticalGridLines />
            <HorizontalGridLines />
            <XAxis />
            <YAxis />
            <VerticalBarSeries
                color="#5D6E97"
                data={chartData}
              />
            </FlexibleWidthXYPlot>
          </div>
          : null
        }
      </div>
		);
	}
}

export default Dashboard;