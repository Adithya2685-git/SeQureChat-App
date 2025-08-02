from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit_aer import AerSimulator
from qiskit import transpile
from concurrent.futures import ThreadPoolExecutor

#basis gates qubit pairs for ALice and Bob Each
# if 4096 then 4096 for alice and bob

    #Aer simulate it for number of qubits required size
    # Shots = qubits /4
def measure(circuits,shots):
    simulator= AerSimulator()

    # Ensure `circuits` is a list
    if not isinstance(circuits, list):
        circuits = [circuits]

    job= simulator.run(circuits, shots=shots,memory= True)
    result = job.result()

    finalstring=""
    
    for i in range(len(circuits)):
        bitstrings = result.get_memory(i)
        for bitstring in bitstrings:
            finalstring+= bitstring[::-1]
    
    finalstring= finalstring.replace(" ", "")
    return finalstring

def rng(qubits):
    
    qc= QuantumCircuit(4,4)
    for i in range(4):
        qc.h(i)

    qc.measure_all()
    return measure(qc,qubits//4)

def makecircuits(totalcircuitscount,paircounts, Alicebasis,Bobbasis):
    circuits=[]
    for i in range(totalcircuitscount):
        qc= QuantumCircuit(paircounts*2,paircounts*2)
        for j in range(paircounts):
             basisindex=i*paircounts+j

             qc.h(j*2)
             qc.cx(j*2,j*2+1)

             if Alicebasis[basisindex]=='1' :
                 qc.h(j*2)
             if Bobbasis[basisindex]=='1':
                 qc.h(j*2+1)

        qc.measure_all()
        circuits.append(qc)

    transpiled_circuits = transpile(circuits, AerSimulator(),optimization_level=0)
    measuredstring= measure(transpiled_circuits,1)

    return measuredstring

def extract_keys(measuredstring):
    """Extract Alice and Bob keys from measured string"""
    alicekey = ""
    bobkey = ""
    
    for i in range(len(measuredstring)):
        if i % 2 == 0:
            alicekey += measuredstring[i]
        else:
            bobkey += measuredstring[i]
    
    return alicekey, bobkey

def filter_keys_by_basis(alicekey, bobkey, Alicebasis, Bobbasis):
    """Remove bits where basis isn't the same from keys"""
    finalbasis = ""
    filtered_alicekey = ""
    filtered_bobkey = ""
    
    for i in range(len(Alicebasis)):
        if Alicebasis[i] == Bobbasis[i]:
            filtered_alicekey += alicekey[i]
            filtered_bobkey += bobkey[i]
            finalbasis += Alicebasis[i]
    
    return filtered_alicekey, filtered_bobkey, finalbasis

def main():
    textsizelimit= 1024

    qubitpairs= textsizelimit *4
    paircounts=4

    Alicebasis = rng(qubitpairs)  # First generate Alice's basis
    Bobbasis = rng(qubitpairs)    # Then generate Bob's basis
    # 0 2 4 6 Alice , 1 3 5 7 BOB ... Even Alice, Odd bob
    totalcircuitscount= qubitpairs// paircounts
    
    measuredstring=makecircuits(totalcircuitscount,paircounts, Alicebasis,Bobbasis)
    
    # Extract initial keys
    alicekey, bobkey = extract_keys(measuredstring)
    
    # Filter keys based on matching basis
    #final_alicekey, final_bobkey, finalbasis = filter_keys_by_basis(alicekey, bobkey, Alicebasis, Bobbasis)
    
    # VVV --- ADD THIS DEBUGGING BLOCK --- VVV

    print("\n--- RUNNING BACKEND SANITY CHECK ---")
    
    # Step 1: Sift the keys using the known bases, just like the frontend does.
    sifted_alice, sifted_bob, _ = filter_keys_by_basis(alicekey, bobkey, Alicebasis, Bobbasis)

    # Step 2: Compare the two sifted keys to check for mismatches.
    mismatches = 0
    if len(sifted_alice) != len(sifted_bob):
        print("❌ FATAL ERROR: Sifted keys have different lengths!")
    else:
        for i in range(len(sifted_alice)):
            if sifted_alice[i] != sifted_bob[i]:
                mismatches += 1
    
    if mismatches > 0:
        error_rate = (mismatches / len(sifted_alice)) * 100
        print(f"❌ BUG CONFIRMED: Found {mismatches} mismatches in the generated keys.")
        print(f"   This is a Quantum Bit Error Rate (QBER) of {error_rate:.2f}%")
    else:
        print("✅ SUCCESS: Keys are perfectly correlated. The bug is not in the generation script.")

    # ^^^ --- END OF DEBUGGING BLOCK --- ^^^
    
    return alicekey,Alicebasis, bobkey,Bobbasis

if __name__== '__main__':
    main()
