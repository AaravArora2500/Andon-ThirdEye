import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div>
      <h1>Home</h1>
      <Link to="/andon">Andon</Link>
      <Link to="/downtime-tagging">Downtime Tagging</Link>
    </div>
  )
}
export default Home;