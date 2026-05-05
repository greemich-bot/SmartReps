import './About.css';
import { AboutSections } from '../components/AboutSection';

function About() {
	return (
		<div className="about-container">
			<header className="about-header">
				<h1>How SmartReps Recommends Workouts</h1>
				<p>
					SmartReps blends your selected goals with your current recovery signals to prioritize the workouts
					that fit your body on a given day.
				</p>
			</header>

      <AboutSections />
		</div>
	);
}

export default About;
