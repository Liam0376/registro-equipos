export type Team = { id: string; name: string; color: string }

export type Student = {
  id: string
  matricula: string
  name: string
  carrera: string
  semestre: number
  teamId: string
  number: number
  registeredAt: string
}

export type State = { teams: Team[]; students: Student[] }