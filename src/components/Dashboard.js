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
import InputMask from 'react-input-mask';

import { getDatesDifference , calculateRollingRetention } from '../utilities/calculations.js';
import { addLastValueField } from '../utilities/miscellaneous.js';
import { areAllFieldsValid } from '../utilities/validations.js';
import '../styles/Dashboard.css';

const dateFormat = new RegExp("(0[1-9]|[1-3][0-9]).(1[0-2]|0[1-9]).([0-9]{4})");
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

function Dashboard() {
	const [error, setError] = useState(null);
	const [isLoaded, setIsLoaded] = useState(false);
	const [items, setItems] = useState([]);
	const [modifiedItems, setModifiedItems] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartDataCalculated, setChartDataCalculated] = useState(false);
  const [rollingRetention, setRollingRetention] = useState(null);
  const [showFormatErr, setShowFormatErr] = useState(false);
  const [showNegativeDiffErr, setShowNegativeDiffErr] = useState(false);
  const [lastValueFieldAdded, setLastValueFieldAdded] = useState(false);

  const chartRef = useRef(null);
  // const userRef = useRef(null);

  const handleOnChange = e => {
    if (!lastValueFieldAdded) {
      addLastValueField(items);
      setLastValueFieldAdded(true);
    }
    setRollingRetention(null);
    setChartDataCalculated(false);
    setShowFormatErr(false);
    setShowNegativeDiffErr(false);
    const id = parseInt(e.target.name.split(' ')[0]);
    const field = e.target.name.split(' ')[1];
    const index = items.findIndex(item => item.id === id);

    items[index].lastValue = e.target.value;
    
    if (!modifiedItems.map(item => item.id).includes(items[index].id)) {
      const modifiedItem = {};
      modifiedItem["id"] = items[index].id;
      modifiedItem["fields"] = [field];
      setModifiedItems([...modifiedItems, modifiedItem]);
    } else {      
      const indexOfModified = modifiedItems.findIndex(item => item.id === id);
      if (!modifiedItems[indexOfModified].fields.includes(field)) {
        modifiedItems[indexOfModified].fields.push(field);
      }
    }

    if (!e.target.value.includes("_")) {
      if (dateFormat.test(e.target.value)) {
        items[index][field] = dayjs(e.target.value, "DD.MM.YYYY").format();
        setItems(items);
        if (getDatesDifference(items[index].lastActivityDate, items[index].createdDate) < 0) {
          setShowNegativeDiffErr(true);
        }
      }
      else {
        setShowFormatErr(true);
      }
    }
  }

  const handleSave = () => {

    if (!areAllFieldsValid(items)) {
      setShowFormatErr(true);
      return;
    } else {
      if (!showFormatErr && !showNegativeDiffErr) {
        for (let modifiedItem of modifiedItems) {
          const itemId = modifiedItem.id
          const item = items.find(item => item.id === itemId);
  
          if (getDatesDifference(item.lastActivityDate, item.createdDate) < 0) {
            setShowNegativeDiffErr(true);
            return;
          }
  
          if (modifiedItem.fields.includes("createdDate")) {
            item.createdDate = dayjs(dayjs(item.createdDate).valueOf()+86400000).format()
          }
          if (modifiedItem.fields.includes("lastActivityDate")) {
            item.lastActivityDate = dayjs(dayjs(item.lastActivityDate).valueOf()+86400000).format()
          }
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
    }
  }

  const handleCalculate = async () => {

    if (!areAllFieldsValid(items)) {
      setShowFormatErr(true);
      return;
    } else {
      if (!showFormatErr && !showNegativeDiffErr) {
        const usersLifetimes = items.map(item => getDatesDifference(item.lastActivityDate, item.createdDate));
  
        setShowNegativeDiffErr(false);
  
        if (usersLifetimes.some(v => v < 0)) {
          setShowNegativeDiffErr(true);
          return;
        }
  
        const occurences = {}
  
        usersLifetimes.forEach(lifetime => {
          if (occurences[`${lifetime}`] === undefined) {
            occurences[`${lifetime}`] = 1
          } else {
            occurences[`${lifetime}`] += 1
          }
        });
  
        const data = Object.keys(occurences).map(i => {
          const obj = {};
          obj.x = parseInt(i);
          obj.y = occurences[i];
          return obj;
        });
  
        setChartData(data);
        setRollingRetention(calculateRollingRetention(7, items));
        await setChartDataCalculated(true);
        return chartRef.current.scrollIntoView({behavior: 'smooth'});
      }
    }
  }

  // const handleAdd = async () => {
  //   const newUser = {createdDate: dayjs(), lastActivityDate: dayjs()};

  //   setChartDataCalculated(false);
  //   setRollingRetention(null);

  //   await fetch("https://abtestapiak.herokuapp.com/api/users", {
  //     method: "POST",
  //     body: JSON.stringify(newUser),
  //     headers: {
  //       "Content-Type": "application/json"
  //     }
  //   })
  //   .then(res => res.json())
  //   .then(result => setItems([...items, result.value]))
  //   .catch(error => console.log(error));

  //   return userRef.current.scrollIntoView({behavior: 'smooth'});
  // }



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
			);
	}, []);

	if (error) {
		return <div>Error: {error.message}</div>;
	} else if (!isLoaded) {
		return <div>Loading...</div>;
	} else {
		return (
      <div className="Wrapper">
        {showFormatErr ? <h4 className="Error">Use proper date format</h4> : null}
        {showNegativeDiffErr ? <h4 className="Error">Last activity date can't be earlier than registration date</h4> : null}
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
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>
                  <InputMask
                    name={`${item.id} createdDate`}
                    onChange={handleOnChange}
                    mask="99.99.9999"
                    defaultValue={dayjs(item.createdDate).format("DD.MM.YYYY")}
                    placeholder="Enter date"
                  />
                </td>
                <td>
                  <InputMask
                    name={`${item.id} lastActivityDate`}
                    onChange={handleOnChange}
                    mask="99.99.9999"
                    defaultValue={dayjs(item.lastActivityDate).format("DD.MM.YYYY")}
                    placeholder="Enter date"
                  />
                </td>
              </tr>
              
            ))}
          </tbody>
        </table>
        <div className="Buttons">
          {/* <span onClick={handleAdd}>Add user</span> */}
          <span onClick={handleSave}>Save</span>
          <span onClick={handleCalculate}>Calculate</span>
        </div>
        <p className="RollingRetention">
          {
          rollingRetention === null 
          ? null 
          : `Rolling retention 7 day: ${rollingRetention}`
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
            <XAxis/>
            <YAxis 
              title="Number of users"
              tickFormat={val => Math.floor(val) === val ? val : ""}
            />
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