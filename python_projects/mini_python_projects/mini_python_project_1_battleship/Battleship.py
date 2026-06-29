"""A beginner-friendly, one-player Battleship game.

This module demonstrates how a class can organize a complete program into
small, related methods. The game uses a one-dimensional list instead of a
traditional grid, which keeps the focus on lists, loops, decisions, and
method calls.
"""


class Battleship:
    """Group the data and behaviors needed to play one-dimensional Battleship.

    The class does not create individual ``Battleship`` objects. Instead, its
    static methods cooperate to run the game. A static method is appropriate
    here because each operation uses values passed to it or class constants;
    it does not need a separate ``self`` object.
    """

    # These class constants collect the game's fixed rules in one place.
    # Uppercase names signal that these values should not change during play.
    BOARD_SIZE = 20
    MAX_MISSES = 6
    SHIP_SIZES = [2, 3, 4]

    # Short markers make each board position easy to display and compare.
    EMPTY = "-"
    SHIP = "S"
    HIT = "H"
    MISS = "M"

    @staticmethod
    def main():
        """Start the program and continue creating games while requested.

        ``main`` is intentionally short. The detailed game rules belong in
        other methods, making the program easier to read, test, and maintain.
        """
        print("Welcome to One-Dimensional Battleship!")

        # The loop controls complete games rather than individual guesses.
        play_again = True
        while play_again:
            Battleship.play_game()
            play_again = Battleship.ask_play_again()

        print("Thanks for playing!")

    @staticmethod
    def play_game():
        """Set up the boards, accept guesses, and finish one complete game.

        Two boards serve different purposes:

        * ``hidden_board`` stores the secret ship locations.
        * ``display_board`` stores only information the player may see.

        Keeping these lists separate prevents the program from accidentally
        revealing ships that have not yet been hit.
        """
        hidden_board = Battleship.create_empty_board()
        display_board = Battleship.create_empty_board()
        Battleship.place_ships(hidden_board)

        # Hits and misses are tracked separately so the status display and
        # winning/losing rules can use them directly.
        hits = 0
        misses = 0

        print("\nA new game is starting!")
        print(
            f"The board has positions 0 through {Battleship.BOARD_SIZE - 1}."
        )
        print(f"There are {len(Battleship.SHIP_SIZES)} hidden ships.")
        print(
            f"You lose after more than {Battleship.MAX_MISSES} misses."
        )
        print(
            f"{Battleship.HIT} = hit, {Battleship.MISS} = miss, "
            f"{Battleship.EMPTY} = not guessed"
        )

        # Both conditions must remain true for another turn to begin. The game
        # stops after the final ship position is hit or misses become greater
        # than the allowed maximum.
        while (
            not Battleship.all_ships_sunk(hidden_board)
            and misses <= Battleship.MAX_MISSES
        ):
            Battleship.display_status(display_board, hits, misses)
            guess = Battleship.get_user_guess()

            # Invalid positions do not count as a turn.
            if guess < 0 or guess >= Battleship.BOARD_SIZE:
                print(
                    f"Error: please enter a position from 0 through "
                    f"{Battleship.BOARD_SIZE - 1}."
                )
                continue

            result = Battleship.process_guess(
                guess, hidden_board, display_board
            )

            # process_guess returns a marker so this method can update the
            # matching counter. A repeated guess returns None and changes
            # neither total.
            if result == Battleship.HIT:
                hits += 1
            elif result == Battleship.MISS:
                misses += 1

        # Show the completed visible board before announcing the outcome.
        Battleship.display_status(display_board, hits, misses)

        if Battleship.all_ships_sunk(hidden_board):
            print("\nYou win! You found every part of every ship!")
        else:
            print("\nYou lose! You went over the maximum number of misses.")

    @staticmethod
    def create_empty_board():
        """Return a new board list containing only empty position markers.

        List multiplication creates exactly ``BOARD_SIZE`` independent string
        entries. A fresh list is returned each time, allowing the hidden and
        display boards to change separately.
        """
        return [Battleship.EMPTY] * Battleship.BOARD_SIZE

    @staticmethod
    def place_ships(hidden_board):
        """Place every required ship randomly without overlap.

        Each ship occupies consecutive positions in the one-dimensional list.
        If a random location overlaps an earlier ship, the method chooses a
        new location and tries again.
        """
        import random

        # Different values in SHIP_SIZES create ships of different lengths.
        for ship_size in Battleship.SHIP_SIZES:
            ship_placed = False

            # Continue searching until this entire ship has a valid location.
            while not ship_placed:
                # The starting position must leave enough room for the ship.
                largest_start = Battleship.BOARD_SIZE - ship_size
                start_position = random.randint(0, largest_start)

                if Battleship.can_place_ship(
                    hidden_board, start_position, ship_size
                ):
                    # range stops before its second argument, so adding
                    # ship_size marks exactly the correct number of positions.
                    for position in range(
                        start_position, start_position + ship_size
                    ):
                        hidden_board[position] = Battleship.SHIP

                    ship_placed = True

    @staticmethod
    def can_place_ship(hidden_board, start_position, ship_size):
        """Return whether a ship fits in the proposed positions.

        The caller has already selected an in-range starting position. This
        method therefore focuses on the other placement rule: every position
        needed by the ship must still be empty.
        """
        for position in range(start_position, start_position + ship_size):
            if hidden_board[position] != Battleship.EMPTY:
                # One occupied position is enough to reject the placement.
                return False

        return True

    @staticmethod
    def get_user_guess():
        """Ask for a board position and convert the entered text to an integer.

        Range checking is handled by ``play_game``. Keeping input and range
        validation separate gives each block of code one clear responsibility.
        """
        return int(input("\nEnter your guess: "))

    @staticmethod
    def process_guess(guess, hidden_board, display_board):
        """Update the boards for one valid guess and return its result marker.

        A new hit returns ``H`` and a new miss returns ``M``. Repeated guesses
        return ``None`` so they do not increase either score. Notice that ship
        locations are checked only on the hidden board, while results are also
        copied to the board that the player can see.
        """
        # Check the visible board first because it records all earlier guesses.
        if display_board[guess] == Battleship.HIT:
            print("You already guessed that position and found a hit.")
            return None

        if display_board[guess] == Battleship.MISS:
            print("You already guessed that position and found water.")
            return None

        # A hit replaces the secret ship marker so all_ships_sunk can later
        # determine whether any unhit ship positions remain.
        if hidden_board[guess] == Battleship.SHIP:
            hidden_board[guess] = Battleship.HIT
            display_board[guess] = Battleship.HIT
            print("Hit! You found part of a ship.")
            return Battleship.HIT

        # Water does not need to be marked on the hidden board. Recording the
        # miss on the display board is enough to show and detect the guess.
        display_board[guess] = Battleship.MISS
        print("Miss! That position is water.")
        return Battleship.MISS

    @staticmethod
    def display_status(display_board, hits, misses):
        """Print aligned position numbers, visible markers, and score totals.

        The width specification ``:2`` gives every value two character spaces.
        This keeps single- and double-digit positions lined up for readability.
        """
        position_numbers = " ".join(
            f"{position:2}" for position in range(Battleship.BOARD_SIZE)
        )
        board_values = " ".join(f"{value:2}" for value in display_board)

        print("\nPositions:")
        print(position_numbers)
        print("Board:")
        print(board_values)
        print(
            f"Total hits: {hits} | Total misses: {misses} "
            f"| Maximum allowed misses: {Battleship.MAX_MISSES}"
        )

    @staticmethod
    def all_ships_sunk(hidden_board):
        """Return ``True`` when the hidden board has no unhit ship markers.

        Every successful hit changes an ``S`` to an ``H``. Therefore, searching
        for a remaining ``S`` is a simple way to determine whether the player
        has found every occupied ship position.
        """
        return Battleship.SHIP not in hidden_board

    @staticmethod
    def ask_play_again():
        """Return whether the player's response requests another game.

        ``strip`` removes surrounding spaces and ``lower`` accepts either an
        uppercase or lowercase Y. Any response other than ``y`` ends play.
        """
        answer = input("\nWould you like to play again? (y/n): ")
        return answer.strip().lower() == "y"


# This standard Python guard runs main only when this file is launched
# directly. Importing Battleship from another script will not start the game.
if __name__ == "__main__":
    Battleship.main()
