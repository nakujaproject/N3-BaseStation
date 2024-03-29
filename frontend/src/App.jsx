import { useRef,useEffect,useState } from 'react';
import MQTT from 'paho-mqtt'
import './App.css'
import LineChart from './components/lineChart';
import Video from './components/Video';
import Model from './components/model';
import Countdown from './components/countdown';
import Telemetry from './components/telemetry';
import Map from './components/Map';
import setting from './assets/setting.svg';

let client = new MQTT.Client("192.168.78.19", 1883, `dashboard-${((new Date()).getTime()).toString().slice(4)}`);
//called when client connects
let onConnect = () => {
	console.log("connected");
	client.subscribe("n3/telemetry");
	document.getElementById('connected').innerHTML = "MQTT connected";
}
// connect the client
client.connect({
	onSuccess:onConnect,
	keepAliveInterval: 3600,
});
let previousAltitude = 0;
function App() {
	let altitudeChartRef = useRef();
	let velocityChartRef = useRef();
	let accelerationChartRef = useRef();

	let toRadians = (angle) => {
		return angle * (Math.PI / 180);
	}

	let [altitude,setAltitude] = useState(0);//filterd altitude
	let [agl,setAGL] = useState(0);//filterd altitude
	let [gx,setGx] = useState(toRadians(0));
	let [gy,setGy] = useState(toRadians(180));
	let [gz,setGz] = useState(toRadians(0));
	let [latitude,setLatitude] = useState(-1.0953775626377544);
	let [longitude,setLongitude] = useState(37.01223403257954);
	let [state,setState] = useState(0);
	let [stream,setStream] = useState(true);
	let [apogee, setApogee] = useState(0);
	
	// called when the client loses its connection
	let onConnectionLost = (responseObject) => {
		if (responseObject.errorCode !== 0) {
		console.log("onConnectionLost:"+responseObject.errorMessage);
		}
		
	}
	
	// called when a message arrives
	let onMessageArrived = (message) => {
		//0: "Timestamp"1: "Altitude"2: "ax"3: "ay"4: "az"5: "gx"6: "gy"7: "gz"8: "filtered_s"9: "filtered_v"10: "filtered_a"
		console.log("onMessageArrived:");
		// let newData = JSON.parse(message.payloadString);
		let newData = message.payloadString.split(',');
		let time = Date.now();
		console.log(newData.length);
		if(newData.length===14){
			if(parseInt(newData[7])>previousAltitude) setApogee(newData[7]);
			previousAltitude = parseInt(newData[7]);
			console.log(`Previous ALT == ${typeof(previousAltitude)}`)
			setAGL(newData[7]);
			setGx(newData[4]);
			setGy(newData[5]);
			setGz(newData[6]);
			setLatitude(newData[11]);
			setLongitude(newData[12]);
			setState(newData[13]);
			altitudeChartRef.current.data.datasets[0].data.push({x: time, y:newData[7]});
			altitudeChartRef.current.data.datasets[1].data.push({x: time, y:newData[8]});
			altitudeChartRef.current.update('quiet');
			//
			velocityChartRef.current.data.datasets[0].data.push({x: time, y:newData[9]});
			velocityChartRef.current.update('quiet');
			//
			accelerationChartRef.current.data.datasets[0].data.push({x: time, y:newData[1]});//ax
			accelerationChartRef.current.data.datasets[1].data.push({x: time, y:newData[2]});
			accelerationChartRef.current.data.datasets[2].data.push({x: time, y:newData[3]});
			accelerationChartRef.current.data.datasets[3].data.push({x: time, y:newData[10]});
			accelerationChartRef.current.update('quiet');
		}
	}

	// set callback handlers
	client.onConnectionLost = onConnectionLost;
	client.onMessageArrived = onMessageArrived;
	

  return (
		<div className="lg:max-h-screen max-w-screen overflow-hidden">
			<main className="p-2">
				<div id='connected' className="text-sm lg:text-base text-center">
					MQTT not connected
				</div>
				<div className="text-xs lg:text-base md:w-2/3 mx-auto font-bold flex flex-wrap justify-between">
					<span className=' text-3xl'>
					T{true?'-':'+'} <Countdown target="November 27, 2023 13:00:00"/>
					</span>
					<span>State:{['PRE_FLIGHT','POWERED_FLIGHT','APOGEE','BALLISTIC_DESCENT','PARACHUTE_DESCENT','POST_FLIGHT'][parseInt(state)]} </span>
					<span>AGL: {agl}m</span>
					<span>APOGEE: {apogee}m</span>
					<button onClick={e=>{document.getElementById('settings').style.visibility='visible'}}><img src={setting} className=""/></button>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-3">
					<div>
						<div className='choice'>
							<button id={stream?'active':''} onClick={(e)=>{setStream(true)}}>Live Stream</button>
							<button id={stream?'':'active'} onClick={(e)=>{setStream(false)}}>Map</button>
						</div>
						{
						stream?
						<Video/>
						:
						<Map position={[latitude,longitude]}/>
						}
					</div>
					{/* <Telemetry /> */}
					<div className="lg:order-first w-full lg:w-12/12 lg:col-span-2">
						<Model x={gx} y={gy} z={gz} />
					</div>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-3">
					<div className="w-full lg:w-11/12">
						<LineChart ref={altitudeChartRef} type="altitude" />
					</div>
					<div className="w-full lg:w-11/12">
						<LineChart ref={velocityChartRef} type="velocity" />
					</div>
					<div className="w-full lg:w-11/12">
						<LineChart	ref={accelerationChartRef}	type="acceleration"/>
					</div>
				</div>
			</main>
		</div>
  )
}

export default App
