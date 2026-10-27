import os
import subprocess
import sys


def run_all_tests():
    tests_dir = os.path.join(os.path.dirname(__file__), "tests")
    solution_path = os.path.join(os.path.dirname(__file__), "problem02_campus_audit.py")

    test_files = sorted([f for f in os.listdir(tests_dir) if f.endswith(".in")])

    all_passed = True
    print(f"Running {len(test_files)} tests...\n")

    for in_file in test_files:
        case_name = in_file[:-3]
        out_file = case_name + ".out"
        in_path = os.path.join(tests_dir, in_file)
        out_path = os.path.join(tests_dir, out_file)

        if not os.path.exists(out_path):
            print(f"[{case_name}] FAIL - missing expected output file {out_file}")
            all_passed = False
            continue

        with open(in_path, "r", encoding="utf-8") as f:
            stdin_data = f.read()

        with open(out_path, "r", encoding="utf-8") as f:
            expected_output = f.read().strip()

        proc = subprocess.run(
            [sys.executable, solution_path],
            input=stdin_data,
            text=True,
            capture_output=True,
        )

        if proc.returncode != 0:
            print(f"[{case_name}] FAIL - non-zero exit code {proc.returncode}")
            if proc.stderr:
                print(proc.stderr)
            all_passed = False
            continue

        actual_output = proc.stdout.strip()

        if actual_output == expected_output:
            print(f"[{case_name}] PASS")
        else:
            print(f"[{case_name}] FAIL")
            print("--- Expected ---")
            print(expected_output)
            print("--- Actual ---")
            print(actual_output)
            print("----------------")
            all_passed = False

    print("\n" + ("ALL TESTS PASSED" if all_passed else "SOME TESTS FAILED"))
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    run_all_tests()
