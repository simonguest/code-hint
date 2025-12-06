export interface CodeExample {
  title: string;
  code: string;
}

export const examples: CodeExample[] = [
  {
    title: "Hello World",
    code: `print("Hello, World!")`
  },
  {
    title: "Add Two Numbers",
    code: `def add_numbers(a, b):
    return a + b

result = add_numbers(5, 3)
print(f"The sum is: {result}")`
  },
  {
    title: "Python Class",
    code: `class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def bark(self):
        return f"{self.name} says Woof!"

    def get_age(self):
        return f"{self.name} is {self.age} years old"

my_dog = Dog("Buddy", 3)
print(my_dog.bark())
print(my_dog.get_age())`
  },
  {
    title: "Recursive Factorial",
    code: `def factorial(n):
    if n == 0 or n == 1:
        return 1
    else:
        return n * factorial(n - 1)

number = 5
result = factorial(number)
print(f"The factorial of {number} is {result}")`
  },
  {
    title: "Tic-Tac-Toe Game",
    code: `def print_board(board):
    for row in board:
        print(" | ".join(row))
        print("-" * 9)

def check_winner(board, player):
    for row in board:
        if all(cell == player for cell in row):
            return True
    for col in range(3):
        if all(board[row][col] == player for row in range(3)):
            return True
    if all(board[i][i] == player for i in range(3)):
        return True
    if all(board[i][2-i] == player for i in range(3)):
        return True
    return False

board = [[" " for _ in range(3)] for _ in range(3)]
current_player = "X"
moves = 0

while moves < 9:
    print_board(board)
    print(f"Player {current_player}'s turn")

    row = int(input("Enter row (0-2): "))
    col = int(input("Enter column (0-2): "))

    if board[row][col] == " ":
        board[row][col] = current_player
        moves += 1

        if check_winner(board, current_player):
            print_board(board)
            print(f"Player {current_player} wins!")
            break

        current_player = "O" if current_player == "X" else "X"
    else:
        print("Cell already taken!")

if moves == 9:
    print("It's a draw!")`
  }
];
