import PageTitle from '../components/PageTitle';
import ListCard from '../components/ListCard';

export default function FamilyScreen({ mockData }) {
  return (
    <div className="screen">
      <PageTitle
        title="Family"
        subtitle="Chores, meals, grocery and notes in one calm place."
      />

      <div className="quad-grid">
        <ListCard title="Chores" items={mockData.chores} />
        <ListCard title="Meals" items={mockData.meals} />
        <ListCard title="Grocery" items={mockData.grocery} />
        <ListCard title="Notes" items={mockData.notes} />
      </div>
    </div>
  );
}
